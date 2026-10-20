import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {getDb} from './db';
import {catalogSource,stableId,variantDbId} from './catalog-source';
import {validateBasket,type CatalogProduct} from './shop-model';
export type Session={token_hash:string;anonymous_id:string;session_id:string;assignment_id:string;user_id:string|null;consent:boolean;variant:'A'|'B';snapshot_id:string};
type RuntimeSession={session:Session;expires:number;events:Set<string>};
declare global {var onepieceSessions:Map<string,RuntimeSession>|undefined;}
const sessions=()=>globalThis.onepieceSessions??=new Map<string,RuntimeSession>();
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function findSession(token?:string){if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const row=sessions().get(tokenHash(token));if(!row||row.expires<Date.now()){if(row)sessions().delete(row.session.token_hash);return null;}return row.session;}
export async function createSession(){
 for(const [key,row] of sessions())if(row.expires<Date.now())sessions().delete(key);
 const token=randomBytes(32).toString('hex');const session:Session={token_hash:tokenHash(token),anonymous_id:randomUUID(),session_id:randomUUID(),assignment_id:'',user_id:null,consent:false,variant:'B',snapshot_id:(await catalogSource()).snapshot_id};
 sessions().set(session.token_hash,{session,expires:Date.now()+30*86400000,events:new Set()});return {token,session};
}
export function changeConsent(s:Session,consent:boolean){const row=sessions().get(s.token_hash);if(!row)throw new Error('Session expired.');row.session.consent=consent;return {saved:true};}
export function removeSession(s:Session){sessions().delete(s.token_hash);}
export function rotateSession(s:Session,userId:string){
 const row=sessions().get(s.token_hash);if(!row)throw new Error('Session expired.');removeSession(s);const token=randomBytes(32).toString('hex');const session={...s,token_hash:tokenHash(token),user_id:userId};sessions().set(session.token_hash,{...row,session});return {token,session};
}
const numberId=(id:string)=>1000000+parseInt(createHash('sha256').update(id).digest('hex').slice(0,10),16);
export async function catalog():Promise<CatalogProduct[]>{
 const db=await getDb(),source=await catalogSource();
 const colors=(await db.query<{id:string;product_id:string;handle:string;color_name:string;technical:string;size_guide:string;name:string;description:string;care:string;brand:string}>("SELECT c.*,p.name,p.description,p.care,b.name AS brand FROM product_colors c JOIN products p ON p.id=c.product_id JOIN brands b ON b.id=p.brand_id WHERE p.status='active' ORDER BY c.sort_order,c.id")).rows;
 const variants=(await db.query<{id:string;product_color_id:string;sku:string;size:string;price:string;is_active:boolean;on_hand:number;reserved:number}>("SELECT v.*,i.on_hand,i.reserved FROM product_variants v JOIN inventories i ON i.variant_id=v.id WHERE v.currency='KRW' ORDER BY v.id")).rows;
 const images=(await db.query<{product_color_id:string;url:string}>('SELECT * FROM product_images ORDER BY sort_order,id')).rows;
 const categories=(await db.query<{product_id:string;name:string}>('SELECT pc.product_id,c.name FROM product_categories pc JOIN categories c ON c.id=pc.category_id ORDER BY c.sort_order,c.id')).rows;
 const sourceIds=new Map(source.products.map((p,i)=>[stableId('color',p.id),{p,id:i+1}]));const variantIds=new Map(source.products.flatMap(p=>p.variants).map((v,i)=>[stableId('variant',v.id),i+1]));
 return colors.map(c=>{
  const original=sourceIds.get(c.id);const id=original?.id??numberId(c.id);let sizeGuide={columns:[] as string[],rows:[] as string[][]};try{const guide=JSON.parse(c.size_guide||'{}');if(Array.isArray(guide.columns)&&Array.isArray(guide.rows))sizeGuide=guide;}catch{}
  const options=variants.filter(v=>v.product_color_id===c.id).map(v=>({id:variantIds.get(v.id)??numberId(v.id),productId:id,sku:v.sku,color:c.color_name,size:v.size,price:Number(v.price),available:v.is_active&&v.on_hand-v.reserved>0})).sort((a,b)=>a.id-b.id);const price=Math.min(...options.map(v=>v.price));
  return {id,name:c.name,brand:c.brand,category:categories.find(v=>v.product_id===c.product_id)?.name||'etc',categoryId:0,color:c.color_name,price:Number.isFinite(price)?price:0,listPrice:Number.isFinite(price)?price:0,available:options.some(v=>v.available),images:images.filter(i=>i.product_color_id===c.id).map(i=>i.url),description:c.technical||c.description||'',careInfo:c.care||'',shippingInfo:'This is a demo store. Payments use test mode, and no items are shipped. Demo delivery is free. Returns do not apply to test orders.',isNew:false,sizeGuide,variants:options,sourceUrl:original?.p.source_url||''};
 });
}
export async function recordEvent(s:Session,body:Record<string,unknown>){
 if(!s.consent)return {stored:false,forward:false};if(!['view_item_list','select_item','view_item','add_to_cart','begin_checkout'].includes(String(body.name)))throw new Error('Unsupported event.');
 const key=String(body.key||'');if(!/^[a-f0-9-]{36}$/.test(key))throw new Error('Invalid event ID.');const row=sessions().get(s.token_hash);if(!row||row.events.has(key))return {stored:false,forward:false};if(row.events.size>10000)row.events.clear();row.events.add(key);
 return {stored:false,forward:true}; // GA4 only; no events/experiments table outside the ERD.
}
export async function syncCart(s:Session,value:unknown){
 const items=Array.isArray(value)&&value.length===0?[]:validateBasket(value),db=await getDb();const mapped=await Promise.all(items.map(async i=>({...i,id:await variantDbId(i.variantId)})));
 return db.transaction(async tx=>{
  const owner=s.user_id;const guest=owner?null:tokenHash(s.anonymous_id);
  const old=(await tx.query<{id:string}>("SELECT id FROM carts WHERE status='active' AND ((customer_id=$1 AND $1 IS NOT NULL) OR (guest_token_hash=$2 AND $2 IS NOT NULL)) FOR UPDATE",[owner,guest])).rows[0];
  const id=old?.id||randomUUID();if(!old)await tx.query("INSERT INTO carts(id,customer_id,guest_token_hash,status,expires_at) VALUES($1,$2,$3,'active',now()+interval '30 days')",[id,owner,guest]);
  await tx.query('DELETE FROM cart_items WHERE cart_id=$1',[id]);
  for(const i of mapped){const v=(await tx.query<{is_active:boolean;on_hand:number;reserved:number;status:string}>('SELECT v.is_active,i.on_hand,i.reserved,p.status FROM product_variants v JOIN inventories i ON i.variant_id=v.id JOIN product_colors c ON c.id=v.product_color_id JOIN products p ON p.id=c.product_id WHERE v.id=$1 FOR UPDATE OF i',[i.id])).rows[0];if(!v||!v.is_active||v.status!=='active'||v.on_hand-v.reserved<i.quantity)throw new Error('This option is unavailable.');await tx.query('INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES($1,$2,$3)',[id,i.id,i.quantity]);}
  return {saved:true};
 });
}
export async function checkout(s:Session,body:Record<string,unknown>){
 if(!s.user_id)throw new Error('Please log in before continuing.');const items=validateBasket(body.items),key=String(body.key||'');if(!/^[a-f0-9-]{36}$/.test(key))throw new Error('Invalid checkout key.');
 const input=body.delivery as Record<string,unknown>|undefined;
 const delivery={name:String(input?.name||'Test recipient').trim(),phone:String(input?.phone||'000-0000-0000').trim(),zipcode:String(input?.zipcode||'00000').trim(),address:String(input?.address||'Demo address (no shipping)').trim(),address2:String(input?.address2||'').trim(),memo:String(input?.memo||'').trim()};
 if(!delivery.name||delivery.name.length>50||!/^[0-9+() -]{7,20}$/.test(delivery.phone)||!/^\d{5}$/.test(delivery.zipcode)||!delivery.address||delivery.address.length>255||delivery.address2.length>255||delivery.memo.length>255)throw new Error('Please check your delivery details.');
 const mapped=await Promise.all(items.map(async i=>({...i,id:await variantDbId(i.variantId)}))),db=await getDb();
 return db.transaction(async tx=>{
  const customer=(await tx.query<{email:string}>('SELECT * FROM customers WHERE id=$1 FOR UPDATE',[s.user_id])).rows[0];if(!customer)throw new Error('Account not found.');
  const old=(await tx.query<{id:string;order_number:string;total_amount:string;shipping_snapshot:typeof delivery}>('SELECT * FROM orders WHERE customer_id=$1 AND checkout_key=$2',[s.user_id,key])).rows[0];
  if(old){const oldItems=(await tx.query<{variant_id:string;quantity:number}>('SELECT variant_id,quantity FROM order_items WHERE order_id=$1',[old.id])).rows.map(i=>({id:i.variant_id,quantity:i.quantity})).sort((a,b)=>a.id.localeCompare(b.id));const requested=mapped.map(i=>({id:i.id,quantity:i.quantity})).sort((a,b)=>a.id.localeCompare(b.id));if(JSON.stringify(oldItems)!==JSON.stringify(requested)||JSON.stringify(old.shipping_snapshot)!==JSON.stringify(delivery))throw new Error('This checkout key was used for different contents.');return {orderNumber:old.order_number,total:Number(old.total_amount),replayed:true};}
  let total=0;const lines=[];
  for(const i of mapped){const v=(await tx.query<{id:string;price:string;sku:string;size:string;is_active:boolean;on_hand:number;reserved:number;name:string;color_name:string;status:string;image:string}>("SELECT v.*,iv.on_hand,iv.reserved,p.name,p.status,c.color_name,(SELECT url FROM product_images WHERE product_color_id=c.id ORDER BY sort_order LIMIT 1) AS image FROM product_variants v JOIN inventories iv ON iv.variant_id=v.id JOIN product_colors c ON c.id=v.product_color_id JOIN products p ON p.id=c.product_id WHERE v.id=$1 AND v.currency='KRW' FOR UPDATE OF iv",[i.id])).rows[0];if(!v||!v.is_active||v.status!=='active'||v.on_hand-v.reserved<i.quantity)throw new Error('This item is sold out or unavailable.');const price=Number(v.price);total+=price*i.quantity;if(!Number.isSafeInteger(total)||total<0)throw new Error('Invalid order amount.');lines.push({...v,price,quantity:i.quantity});}
  const id=randomUUID(),orderNumber='TEST-'+randomUUID();
  await tx.query("INSERT INTO orders(id,customer_id,order_number,status,currency,total_amount,shipping_snapshot,placed_at,email,phone,subtotal_amount,discount_amount,shipping_amount,tax_amount,checkout_key) VALUES($1,$2,$3,'pending','KRW',$4,$5,now(),$6,$7,$4,0,0,0,$8)",[id,s.user_id,orderNumber,total,JSON.stringify(delivery),customer.email,delivery.phone,key]);
  for(const v of lines)await tx.query('INSERT INTO order_items(id,order_id,variant_id,product_snapshot,unit_price,quantity,discount_amount) VALUES($1,$2,$3,$4,$5,$6,0)',[randomUUID(),id,v.id,JSON.stringify({name:v.name,sku:v.sku,option:`${v.color_name} / ${v.size}`,image:v.image}),v.price,v.quantity]);
  return {orderNumber,total,replayed:false};
 });
}
