'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useShop,shopPost} from './ShopRuntime';
import useCounterStore from '@/shared/store/useCounterStore';
import styles from './AccountPage.module.scss';
export default function AccountPage({join=false}:{join?:boolean}){
 const params=useSearchParams();const {session,refresh,loading}=useShop();const [name,setName]=useState<string|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const member=session?.member;
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{await shopPost('profile',{name:name??member?.name});await refresh();setMessage('Your profile has been saved.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function logout(){setBusy(true);try{await shopPost('logout');useCounterStore.getState().setCartItems(()=>[]);localStorage.removeItem('demo-v1-onepiece-pending-order');location.href='/login';}catch(e){setMessage((e as Error).message);setBusy(false);}}
 return <main className={styles.page}><div className={styles.brand}>OnePiece</div><section className={styles.form}>
 <h1>{member?(join?'Profile':'My account'):(join?'Join':'Log in')}</h1>
 <p className={styles.muted}>{member?`Welcome, ${member.name}.`:'Log in or create a ONEPIECE account'}</p>
 {loading?<p role="status">Loading…</p>:member?<form onSubmit={save}>
 <label>Name / Nickname<input value={name??member.name} onChange={e=>setName(e.target.value)} maxLength={50} required autoComplete="nickname"/></label>
 <button className={styles.primary} disabled={busy}>Save profile</button><Link className={styles.secondary} href="/checkout">Continue to checkout</Link><button type="button" className={styles.textButton} disabled={busy} onClick={()=>void logout()}>Log out</button></form>:<>
 <a className={styles.primary} href={session?.kakaoConfigured?'/api/auth/kakao':'#setup'} aria-disabled={!session?.kakaoConfigured}>{join?'Join with Kakao':'Log in with Kakao'} <span aria-hidden="true">→</span></a>
 <div className={styles.divider}>ONEPIECE MEMBERSHIP</div>
 <p className={styles.muted}>Your first Kakao sign-in creates a OnePiece account. Items in your bag stay with you after sign-in.</p>
 {!session?.kakaoConfigured&&<p id="setup" role="status" className={styles.notice}>Kakao sign-in is currently unavailable. Please try again later.</p>}
 <Link className={styles.secondary} href={join?'/login':'/join'}>{join?'Already a member? Log in':'New to OnePiece? Join'}</Link>
 </>}
 {params.has('error')&&<p role="alert" className={styles.notice}>We could not complete your sign-in. Please try again.</p>}
 {message&&<p role="status" className={styles.notice}>{message}</p>}
 <Link className={styles.textButton} href="/products">Continue shopping</Link>
 </section><p className={styles.foot}>ONEPIECE · Demo store</p></main>;
}
