import {randomBytes,randomUUID} from 'node:crypto';
import {getDb} from './db';
import {tokenHash,rotateSession,type Session} from './shop-server';
import {createPaymentAttempt,approvePayment,reconcilePayment} from './toss-payments';
export const appOrigin=()=>process.env.APP_ORIGIN||'http://127.0.0.1:3019';
export function providerConfig(){return {kakaoConfigured:!!process.env.KAKAO_REST_API_KEY,tossConfigured:/^test_ck_/.test(process.env.TOSS_CLIENT_KEY||'')&&/^test_sk_/.test(process.env.TOSS_SECRET_KEY||'')};}
declare global {var onepieceOauthStates:Map<string,{session:string;expires:number}>|undefined;}
const states=()=>globalThis.onepieceOauthStates??=new Map<string,{session:string;expires:number}>();
export async function member(s:Session){if(!s.user_id)return null;const row=(await(await getDb()).query<{name:string;auth_subject:string}>('SELECT name,auth_subject FROM customers WHERE id=$1',[s.user_id])).rows[0];return row?{name:row.name,provider:row.auth_subject.split(':')[0]}:null;}
export async function startKakao(s:Session){
 if(!providerConfig().kakaoConfigured)throw new Error('Kakao sign-in is currently unavailable.');for(const [key,row] of states())if(row.expires<Date.now())states().delete(key);
 const state=randomBytes(32).toString('hex');states().set(tokenHash(state),{session:s.token_hash,expires:Date.now()+600000});
 return 'https://kauth.kakao.com/oauth/authorize?'+new URLSearchParams({client_id:process.env.KAKAO_REST_API_KEY!,redirect_uri:appOrigin()+'/api/auth/kakao/callback',response_type:'code',state});
}
export async function finishKakao(s:Session,state:string,code:string){
 const key=tokenHash(state),row=states().get(key);if(!row||row.session!==s.token_hash||row.expires<Date.now()||!code)throw new Error('Your sign-in request has expired.');states().delete(key);
 const form=new URLSearchParams({grant_type:'authorization_code',client_id:process.env.KAKAO_REST_API_KEY!,redirect_uri:appOrigin()+'/api/auth/kakao/callback',code});if(process.env.KAKAO_CLIENT_SECRET)form.set('client_secret',process.env.KAKAO_CLIENT_SECRET);
 const response=await fetch('https://kauth.kakao.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(15000)});const tokens=await response.json();if(!response.ok||!tokens.access_token)throw new Error('Kakao authentication failed.');
 const result=await fetch('https://kapi.kakao.com/v2/user/me',{headers:{Authorization:'Bearer '+tokens.access_token},signal:AbortSignal.timeout(15000)});const profile=await result.json();if(!result.ok||!Number.isSafeInteger(profile.id))throw new Error('We could not verify your Kakao account.');return linkKakao(s,String(profile.id));
}
// Server-only identity linking after provider verification. Never accepts a browser-supplied subject.
export async function linkKakao(s:Session,subject:string){
 const db=await getDb();const userId=await db.transaction(async tx=>{
  const customer=(await tx.query<{id:string}>("INSERT INTO customers(id,auth_subject,email,name,phone,created_at) VALUES($1,$2,'','ONEPIECE member','',now()) ON CONFLICT(auth_subject) DO UPDATE SET auth_subject=excluded.auth_subject RETURNING id",[randomUUID(),'kakao:'+subject])).rows[0];
  const guest=(await tx.query<{id:string}>("SELECT id FROM carts WHERE guest_token_hash=$1 AND status='active' FOR UPDATE",[tokenHash(s.anonymous_id)])).rows[0];
  if(guest){const existing=(await tx.query<{id:string}>("SELECT id FROM carts WHERE customer_id=$1 AND status='active' FOR UPDATE",[customer.id])).rows[0];if(existing){await tx.query('INSERT INTO cart_items(cart_id,variant_id,quantity) SELECT $1,variant_id,quantity FROM cart_items WHERE cart_id=$2 ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=least(10,cart_items.quantity+excluded.quantity)',[existing.id,guest.id]);await tx.query("UPDATE carts SET status='merged' WHERE id=$1",[guest.id]);}else await tx.query('UPDATE carts SET customer_id=$1,guest_token_hash=NULL WHERE id=$2',[customer.id,guest.id]);}
  return customer.id;
 });return rotateSession(s,userId);
}
export async function updateMember(s:Session,body:Record<string,unknown>){if(!await member(s))throw new Error('Please log in with Kakao.');const name=String(body.name||'').trim();if(!name||name.length>50)throw new Error('Please check your name.');await(await getDb()).query('UPDATE customers SET name=$1 WHERE id=$2',[name,s.user_id]);return {saved:true};}
export async function prepareToss(s:Session,body:Record<string,unknown>){if(!providerConfig().tossConfigured)throw new Error('Test payments are currently unavailable.');if(!await member(s))throw new Error('Please log in with Kakao.');return {...await createPaymentAttempt(s,body),clientKey:process.env.TOSS_CLIENT_KEY,customerKey:s.user_id,orderName:'ONEPIECE order',successUrl:appOrigin()+'/checkout/success',failUrl:appOrigin()+'/checkout/fail'};}
export async function confirmToss(s:Session,body:Record<string,unknown>){if(!providerConfig().tossConfigured)throw new Error('Test payments are currently unavailable.');return approvePayment(s,body);}
export async function refreshToss(s:Session,body:Record<string,unknown>){if(!providerConfig().tossConfigured)throw new Error('Test payments are currently unavailable.');return reconcilePayment(s,body);}
