'use client';
import Image from 'next/image';
import Link from 'next/link';
import type {PointerEvent} from 'react';
import {useShop} from '@/components/ShopRuntime';
import styles from './CampaignHero.module.scss';
export function CampaignHero(){
 const {raw,track}=useShop();
 const jacket=raw.find(p=>p.sourceUrl==='/demo/demo-01-ink');
 const pants=raw.find(p=>p.sourceUrl==='/demo/demo-09-ink');
 function move(e:PointerEvent<HTMLElement>){const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--x',`${e.clientX-r.left}px`);e.currentTarget.style.setProperty('--y',`${e.clientY-r.top}px`);}
 return <main className={styles.campaign} aria-label="ONEPIECE demo campaign" onPointerMove={move}>
 <Image className={styles.media} src="/demo/campaign.svg" alt="Original geometric illustration of a jacket and trousers" fill preload sizes="100vw"/>
 <div className={styles.shade} aria-hidden="true"/>
 {jacket&&<Link className={`${styles.hotspot} ${styles.jacket}`} href={`/products/${jacket.id}`} aria-label="View demo Studio Jacket" onClick={()=>void track('select_item',jacket.id)}><span className={styles.caption}>Shop the demo jacket ↗</span></Link>}
 {pants&&<Link className={`${styles.hotspot} ${styles.pants}`} href={`/products/${pants.id}`} aria-label="View demo Wide Trousers" onClick={()=>void track('select_item',pants.id)}><span className={styles.caption}>Shop the demo trousers ↗</span></Link>}
 <span className={styles.lookNote}>FICTIONAL STORE · TEST PAYMENTS ONLY</span>
 <section className={styles.discovery} aria-labelledby="brand-title"><h1 id="brand-title">OnePiece</h1><p className={styles.slogan}>A STUDY IN EVERYDAY FORM.</p></section>
 <div className={styles.crosslines} aria-hidden="true"><div className={styles.horizontal}/><div className={styles.vertical}/></div>
 </main>;
}
