import { randomBytes } from 'node:crypto';
import { getDb } from './db';
import { tokenHash, rotateSession, guestCart, type Session } from './shop-server';
import { stableId } from './catalog-source';
import {
    createPaymentAttempt,
    approvePayment,
    reconcilePayment,
} from './toss-payments';
import { appOrigin } from './auth-config';
import { tossConfiguration, tossTestKeys } from './toss-config';
export { appOrigin };
export function providerConfig() {
    return {
        kakaoConfigured: !!process.env.KAKAO_REST_API_KEY,
        tossConfigured: tossConfiguration().configured,
    };
}
declare global {
    var onepieceOauthStates:
        | Map<
              string,
              {
                  session: string;
                  expires: number;
                  returnTo: '/join' | '/app-preview';
              }
          >
        | undefined;
}
const states = () =>
    (globalThis.onepieceOauthStates ??= new Map<
        string,
        { session: string; expires: number; returnTo: '/join' | '/app-preview' }
    >());
export async function member(s: Session) {
 if(!s.user_id)return null;
 const row=(await(await getDb()).query<{display_name:string|null}>('SELECT display_name FROM profiles WHERE id=$1',[s.user_id])).rows[0];
 return row?{name:row.display_name||'ONEPIECE member',provider:'kakao'}:null;
}
export async function startKakao(s: Session, destination?: unknown) {
    if (!providerConfig().kakaoConfigured)
        throw new Error('Kakao sign-in is currently unavailable.');
    for (const [key, row] of states())
        if (row.expires < Date.now()) states().delete(key);
    const state = randomBytes(32).toString('hex');
    states().set(tokenHash(state), {
        session: s.token_hash,
        expires: Date.now() + 600000,
        returnTo: destination === '/app-preview' ? '/app-preview' : '/join',
    });
    return (
        'https://kauth.kakao.com/oauth/authorize?' +
        new URLSearchParams({
            client_id: process.env.KAKAO_REST_API_KEY!,
            redirect_uri: appOrigin() + '/api/auth/kakao/callback',
            response_type: 'code',
            state,
        })
    );
}
export async function finishKakao(s: Session, state: string, code: string) {
    const key = tokenHash(state),
        row = states().get(key);
    if (
        !row ||
        row.session !== s.token_hash ||
        row.expires < Date.now() ||
        !code
    )
        throw new Error('Your sign-in request has expired.');
    states().delete(key);
    const form = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KAKAO_REST_API_KEY!,
        redirect_uri: appOrigin() + '/api/auth/kakao/callback',
        code,
    });
    if (process.env.KAKAO_CLIENT_SECRET)
        form.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
    const response = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(15000),
    });
    const tokens = await response.json();
    if (!response.ok || !tokens.access_token)
        throw new Error('Kakao authentication failed.');
    const result = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: 'Bearer ' + tokens.access_token },
        signal: AbortSignal.timeout(15000),
    });
    const profile = await result.json();
    if (!result.ok || !Number.isSafeInteger(profile.id))
        throw new Error('We could not verify your Kakao account.');
    return {
        ...(await linkKakao(s, String(profile.id))),
        returnTo: row.returnTo,
    };
}

// Local identity adapter: only a server-verified Kakao subject reaches this function.
// Supabase deployment must instead map the managed Auth user's UUID; no client-supplied UUID is trusted.
export async function linkKakao(s: Session, subject: string) {
 if(!subject||subject.length>255)throw new Error('Invalid verified identity.');
 const id=stableId('local-verified-kakao',subject),incoming=guestCart(s),db=await getDb();
 await db.transaction(async tx=>{
  await tx.query('INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING',[id]);
  await tx.query("INSERT INTO profiles(id,display_name) VALUES($1,'ONEPIECE member') ON CONFLICT(id) DO NOTHING",[id]);
  await tx.query('SELECT id FROM profiles WHERE id=$1 FOR UPDATE',[id]);
  if(incoming.length){
   const cart=(await tx.query<{id:number}>('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=now() RETURNING id',[id])).rows[0];
   for(const item of incoming){
    const variant=(await tx.query<{stock_quantity:number}>("SELECT v.stock_quantity FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id LEFT JOIN categories parent ON parent.id=c.parent_id WHERE v.id=$1 AND v.is_active AND p.status='active' AND c.is_active AND (c.parent_id IS NULL OR parent.is_active)",[item.variantId])).rows[0];
    if(!variant||variant.stock_quantity<1)continue;
    const quantity=Math.min(10,variant.stock_quantity,item.quantity);
    await tx.query('INSERT INTO cart_items(cart_id,product_variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(cart_id,product_variant_id) DO UPDATE SET quantity=least(10,$4,cart_items.quantity+excluded.quantity),updated_at=now()',[cart.id,item.variantId,quantity,variant.stock_quantity]);
   }
  }
 });return rotateSession(s,id);
}
export async function updateMember(s: Session, body: Record<string, unknown>) {
    if (!(await member(s))) throw new Error('Please log in.');
    const name = String(body.name || '').trim();
    if (!name || name.length > 50) throw new Error('Please check your name.');
    await (
        await getDb()
    ).query('UPDATE profiles SET display_name=$1,updated_at=now() WHERE id=$2', [name, s.user_id]);
    return { saved: true };
}
export async function prepareToss(s: Session, body: Record<string, unknown>) {
    if (!providerConfig().tossConfigured)
        throw new Error('Test payments are currently unavailable.');
    if (!(await member(s))) throw new Error('Please log in.');
    return {
        ...(await createPaymentAttempt(s, body)),
        clientKey: tossTestKeys().clientKey,
        customerKey: s.user_id,
        orderName: 'ONEPIECE order',
        successUrl: tossTestKeys().origin + '/checkout/success',
        failUrl: tossTestKeys().origin + '/checkout/fail',
    };
}
export async function confirmToss(s: Session, body: Record<string, unknown>) {
    if (!providerConfig().tossConfigured)
        throw new Error('Test payments are currently unavailable.');
    return approvePayment(s, body);
}
export async function refreshToss(s: Session, body: Record<string, unknown>) {
    if (!providerConfig().tossConfigured)
        throw new Error('Test payments are currently unavailable.');
    return reconcilePayment(s, body);
}
