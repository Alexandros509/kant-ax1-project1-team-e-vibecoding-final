import { getDb } from './db';
import { rotateSession, guestCart, type Session } from './shop-server';
import { supabaseAuthConfig } from './supabase-auth';
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
        emailLoginConfigured: !!supabaseAuthConfig(),
        tossConfigured:
            process.env.VERCEL !== '1' && tossConfiguration().configured,
    };
}
export async function member(s: Session) {
    if (!s.user_id) return null;
    if (process.env.VERCEL === '1')
        return { name: s.user_name || 'ONEPIECE member', provider: 'email' };
    const row = (
        await (
            await getDb()
        ).query<{ display_name: string | null }>(
            'SELECT display_name FROM profiles WHERE id=$1',
            [s.user_id],
        )
    ).rows[0];
    return row
        ? { name: row.display_name || 'ONEPIECE member', provider: 'email' }
        : null;
}
// Called only after Supabase Auth verification. No client-supplied member ID is accepted.
// The local ID-only adapter mirrors that same managed UUID, never a hash of the email.
export async function linkVerifiedMember(
    s: Session,
    identity: { id: string; name: string },
) {
    if (
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
            identity.id,
        )
    )
        throw new Error('Invalid verified identity.');
    if (process.env.VERCEL === '1')
        return rotateSession(s, identity.id, identity.name, true);
    const id = identity.id,
        incoming = guestCart(s),
        db = await getDb();
    await db.transaction(async (tx) => {
        await tx.query(
            'INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING',
            [id],
        );
        await tx.query(
            'INSERT INTO profiles(id,display_name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',
            [id, identity.name],
        );
        await tx.query('SELECT id FROM profiles WHERE id=$1 FOR UPDATE', [id]);
        if (incoming.length) {
            const cart = (
                await tx.query<{ id: number }>(
                    'INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=now() RETURNING id',
                    [id],
                )
            ).rows[0];
            for (const item of incoming) {
                const variant = (
                    await tx.query<{ stock_quantity: number }>(
                        "SELECT v.stock_quantity FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id LEFT JOIN categories parent ON parent.id=c.parent_id WHERE v.id=$1 AND v.is_active AND p.status='active' AND c.is_active AND (c.parent_id IS NULL OR parent.is_active)",
                        [item.variantId],
                    )
                ).rows[0];
                if (!variant || variant.stock_quantity < 1) continue;
                const quantity = Math.min(
                    10,
                    variant.stock_quantity,
                    item.quantity,
                );
                await tx.query(
                    'INSERT INTO cart_items(cart_id,product_variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(cart_id,product_variant_id) DO UPDATE SET quantity=least(10,$4,cart_items.quantity+excluded.quantity),updated_at=now()',
                    [cart.id, item.variantId, quantity, variant.stock_quantity],
                );
            }
        }
    });
    return rotateSession(s, id, identity.name);
}
export async function updateMember(s: Session, body: Record<string, unknown>) {
    if (!(await member(s))) throw new Error('Please log in.');
    if (process.env.VERCEL === '1')
        throw new Error('Profile editing is not available in this preview.');
    const name = String(body.name || '').trim();
    if (!name || name.length > 50) throw new Error('Please check your name.');
    await (
        await getDb()
    ).query(
        'UPDATE profiles SET display_name=$1,updated_at=now() WHERE id=$2',
        [name, s.user_id],
    );
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
