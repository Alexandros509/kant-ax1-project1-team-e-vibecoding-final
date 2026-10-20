'use client';
import {createContext,useContext,useEffect,useRef,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import type {CatalogProduct,ExperimentSession} from '@/lib/shop-model';
import {adaptProduct} from '@/lib/catalog-adapter';
import type {Product} from '@/domains/products/types/product.types';
import useCounterStore from '@/shared/store/useCounterStore';
declare global {interface Window{dataLayer:unknown[];gtag?:(...args:unknown[])=>void;}}
export async function shopPost(action:string,body:object={}){const r=await fetch('/api/shop',{method:'POST',headers:{'Content-Type':'application/json','x-shop-request':'1'},body:JSON.stringify({action,...body})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Request failed');return d;}
let bootstrapRequest:Promise<ExperimentSession>|null=null;
function bootstrap(){bootstrapRequest??=fetch('/api/shop?action=session',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).finally(()=>{bootstrapRequest=null;});return bootstrapRequest;}
type Context={products:Product[];raw:CatalogProduct[];session:ExperimentSession|null;preview:'A'|'B'|null;arm:'A'|'B';loading:boolean;error:string;refresh:()=>Promise<void>;track:(name:string,productId?:number,extra?:Record<string,unknown>)=>Promise<void>};
const Runtime=createContext<Context|null>(null);
export const useShop=()=>{const value=useContext(Runtime);if(!value)throw new Error('ShopRuntime required');return value;};
export function basketPayload(){return useCounterStore.getState().cartItems.map(i=>({variantId:i.productVariantId,quantity:i.quantity}));}
export default function ShopRuntime({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<ExperimentSession|null>(null),[raw,setRaw]=useState<CatalogProduct[]>([]),[error,setError]=useState('');
 const pathname=usePathname(),params=useSearchParams();const queryPreview=params.get('preview');const preview=queryPreview==='A'||queryPreview==='B'?queryPreview:null;
 const sent=useRef(new Set<string>());const sessionRef=useRef(session);const previewRef=useRef(preview);
 useEffect(()=>{sessionRef.current=session;previewRef.current=preview;},[session,preview]);
 async function refresh(){setSession(await bootstrap());}
 useEffect(()=>{let live=true;Promise.all([bootstrap(),fetch('/api/shop?action=catalog').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d.products as CatalogProduct[];})]).then(([s,p])=>{
  if(!live)return;setSession(s);setRaw(p);
  try{const saved=JSON.parse(localStorage.getItem('demo-v1-onepiece-original-cart')||'[]');if(Array.isArray(saved))useCounterStore.getState().setCartItems(()=>saved.filter(i=>Number.isInteger(i.productVariantId)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=10).map(i=>{const product=p.find(p=>p.variants.some(v=>v.id===i.productVariantId));const v=product?.variants.find(v=>v.id===i.productVariantId);return v&&product?{id:v.id,cartId:0,productVariantId:v.id,quantity:i.quantity,unitPriceAtAdded:v.price,productNameAtAdded:product.name,optionTextAtAdded:`${v.color} / ${v.size}`,imageUrlAtAdded:product.images[0]}:null;}).filter((item): item is NonNullable<typeof item> => item !== null));}catch{/* Ignore invalid browser-only cart. */}
 }).catch(e=>setError(e.message));return()=>{live=false;};},[]);
 useEffect(()=>{let chain=Promise.resolve();return useCounterStore.subscribe(state=>{try{localStorage.setItem('demo-v1-onepiece-original-cart',JSON.stringify(state.cartItems));}catch{setError('We could not save your bag in this browser.');}const items=state.cartItems.map(i=>({variantId:i.productVariantId,quantity:i.quantity}));if(sessionRef.current&&!previewRef.current)chain=chain.then(async()=>{await shopPost('cart',{items});}).catch(e=>setError('Could not save your bag: '+e.message));});},[]);
 // eslint-disable-next-line prefer-rest-params -- Preserve the standard gtag Arguments queue.
 useEffect(()=>{if(!session?.consent||!/^G-[A-Z0-9]+$/.test(session.gaId)||preview)return;window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag('consent','update',{analytics_storage:'granted'});if(!document.getElementById('onepiece-ga')){const script=document.createElement('script');script.id='onepiece-ga';script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${session.gaId}`;document.head.appendChild(script);window.gtag('js',new Date());window.gtag('config',session.gaId,{send_page_view:false});}},[session,preview]);
 async function track(name:string,productId?:number,extra:Record<string,unknown>={}){
  if(!sessionRef.current?.consent||previewRef.current)return;const s=sessionRef.current;const p=raw.find(p=>p.id===productId);
  try{const gaClientId=await new Promise<string|undefined>(resolve=>{if(!window.gtag||!s.gaId)return resolve(undefined);window.gtag('get',s.gaId,'client_id',resolve);setTimeout(()=>resolve(undefined),250);});const result=await shopPost('event',{name,key:crypto.randomUUID(),productId,path:location.pathname,gaClientId});if(result.forward)window.gtag?.('event',name,{...(s.experimentEnabled?{experiment_id:s.experimentId,experiment_variant:s.variant}:{}),currency:'KRW',...(p?{items:[{item_id:String(p.id),item_name:p.name,price:p.price}]}:{}),...extra});}catch{setError('We could not record this action.');}
 }
 useEffect(()=>{if(!session?.consent||!raw.length||preview)return;const name=pathname==='/products'?'view_item_list':/^\/products\/\d+$/.test(pathname)?'view_item':pathname==='/checkout'&&basketPayload().length?'begin_checkout':null;if(!name||sent.current.has(pathname))return;sent.current.add(pathname);void track(name,name==='view_item'?Number(pathname.split('/').pop()):undefined);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[pathname,session?.consent,raw.length,preview]);
 return <Runtime.Provider value={{products:raw.map(adaptProduct),raw,session,preview,arm:preview||(session?.experimentEnabled?session.variant:'B'),loading:!session||!raw.length,error,refresh,track}}>
 {children}
 {error&&<div role="alert" className="fixed right-4 bottom-28 z-50 max-w-md border bg-white p-4 text-xs shadow">{error}<button className="ml-4" onClick={()=>setError('')}>Close</button></div>}
 {preview?<div className="fixed right-4 bottom-18 z-40 border bg-white px-3 py-2 text-[10px]">{preview} preview · excluded from analytics <Link href="/products?preview=off" className="ml-2 underline">Exit</Link></div>:session&&!session.consent?<div className="fixed inset-x-0 bottom-15 z-40 flex flex-wrap items-center justify-between gap-2 border-t bg-white/95 px-5 py-2 text-[10px]"><span>Demo store · No real charges. With your consent, we record product views, bag activity and test orders.</span><button className="border border-black px-3 py-1" onClick={async()=>{try{await shopPost('consent',{consent:true});await refresh();}catch(e){setError((e as Error).message);}}}>Accept analytics</button></div>:null}
 {session?.consent&&!preview&&<div className="px-6 py-2 text-[10px] text-neutral-500"><button onClick={async()=>{await shopPost('consent',{consent:false});window.gtag?.('consent','update',{analytics_storage:'denied'});await refresh();}}>Stop analytics</button></div>}
 </Runtime.Provider>;
}

