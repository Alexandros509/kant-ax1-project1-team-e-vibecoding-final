import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {catalogSource} from './catalog-source';
process.env.LOCAL_DB_PATH='memory://';
import {getDb,verifySchema,schemaColumns} from './db';
import {catalog,createSession,findSession,changeConsent,recordEvent,syncCart,checkout} from './shop-server';
import {linkKakao,startKakao,finishKakao,prepareToss,confirmToss,refreshToss,providerConfig} from './providers';

test('selected ERD has exactly 26 tables, exact columns, UUID-shaped IDs and normalized catalog',async()=>{
 const db=await getDb();
 try{
  assert.equal((await verifySchema(db)).tables,26);
  const expected=schemaColumns(await readFile('db/erdcloud-source.sql','utf8'));
  const actual=(await db.query<{table_name:string;column_name:string}>("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  for(const [table,columns] of Object.entries(expected))assert.deepEqual(actual.filter(r=>r.table_name===table).map(r=>r.column_name),columns);
  const forbidden=['profiles','auth.users','media_groups','media_files','visitors','wishlist_items','recent_product_views','local_sessions','local_identities','local_oauth_states','experiments','experiment_assignments','user_events','app_schema_migrations','payment_transactions'];
  for(const name of forbidden)assert.equal((await db.query<{t:string|null}>('SELECT to_regclass($1)::text AS t',[name])).rows[0].t,null);
  const source=await catalogSource();const products=await catalog();assert.equal(products.length,source.products.length);assert.equal(products.reduce((n,p)=>n+p.variants.length,0),source.products.reduce((n,p)=>n+p.variants.length,0));assert.equal(products.reduce((n,p)=>n+p.images.length,0),source.products.reduce((n,p)=>n+p.image_references.length,0));assert.equal(products[0].id,1);
  assert.ok((await db.query('SELECT product_id FROM product_colors GROUP BY product_id HAVING count(*)>1')).rows.length>0);
  const color=(await db.query<{id:string}>('SELECT id FROM product_colors LIMIT 1')).rows[0];assert.match(color.id,/^[a-f0-9-]{36}$/);
  await assert.rejects(()=>db.exec('UPDATE inventories SET reserved=on_hand+1'));
  await assert.rejects(()=>db.query('INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES($1,$2,1)',[randomUUID(),randomUUID()]));
 }finally{await db.close();globalThis.onepieceDb=undefined;}
});

test('guest/member cart ownership, canonical order amounts, snapshots and idempotent retries use only ERD tables',async()=>{
 const db=await getDb();try{
  const products=await catalog(),p=products.find(p=>p.available)!,v=p.variants.find(v=>v.available)!;const guest=await createSession();
  await syncCart(guest.session,[{variantId:v.id,quantity:2}]);assert.equal((await db.query('SELECT * FROM cart_items')).rows.length,1);
  const login=await linkKakao(guest.session,'strict-cart');const s=login.session;assert.equal(await findSession(guest.token),null);
  const cart=(await db.query<{customer_id:string;guest_token_hash:null}>('SELECT * FROM carts')).rows[0];assert.equal(cart.customer_id,s.user_id);assert.equal(cart.guest_token_hash,null);
  const body={key:randomUUID(),items:[{variantId:v.id,quantity:2}],total:1};const order=await checkout(s,body);assert.equal(order.total,v.price*2);assert.equal((await checkout(s,body)).orderNumber,order.orderNumber);
  await assert.rejects(()=>checkout(s,{...body,items:[{variantId:v.id,quantity:1}]}));await assert.rejects(()=>checkout(s,{...body,delivery:{phone:'bad'}}));
  const old=(await db.query<{product_snapshot:{name:string}}>('SELECT product_snapshot FROM order_items')).rows[0].product_snapshot.name;
  await db.exec("UPDATE products SET name='Renamed in catalog'");assert.equal((await db.query<{product_snapshot:{name:string}}>('SELECT product_snapshot FROM order_items')).rows[0].product_snapshot.name,old);
  assert.equal((await db.query('SELECT * FROM orders')).rows.length,1);await assert.rejects(()=>db.exec('UPDATE orders SET total_amount=1'));
  assert.deepEqual(await recordEvent(s,{name:'view_item',key:randomUUID()}),{stored:false,forward:false});changeConsent(s,true);const key=randomUUID();assert.equal((await recordEvent(s,{name:'view_item',key})).forward,true);assert.equal((await recordEvent(s,{name:'view_item',key})).forward,false);
  await assert.rejects(()=>recordEvent(s,{name:'purchase',key:randomUUID()}));
 }finally{await db.close();globalThis.onepieceDb=undefined;}
});

test('Kakao state is session-bound/one-time; Toss uses durable idempotency, owner checks and ERD refunds',async()=>{
 const db=await getDb(),originalFetch=globalThis.fetch;
 try{
  process.env.KAKAO_REST_API_KEY='unit-test';process.env.TOSS_CLIENT_KEY='test_ck_unit';process.env.TOSS_SECRET_KEY='test_sk_unit';
  const guest=await createSession(),other=await createSession();const url=new URL(await startKakao(guest.session));let calls=0;
  globalThis.fetch=async(input)=>{calls++;return Response.json(String(input).includes('/token')?{access_token:'mock'}:{id:123456});};
  await assert.rejects(()=>finishKakao(other.session,url.searchParams.get('state')!,'code'));assert.equal(calls,0);
  const login=await finishKakao(guest.session,url.searchParams.get('state')!,'code');const s=login.session;assert.equal(await findSession(guest.token),null);await assert.rejects(()=>finishKakao(s,url.searchParams.get('state')!,'code'));
  const second=await linkKakao(other.session,'123456');assert.equal(second.session.user_id,s.user_id);
  const p=(await catalog()).find(p=>p.available)!,v=p.variants.find(v=>v.available)!;const request={items:[{variantId:v.id,quantity:1}],key:randomUUID()};const order=await prepareToss(s,request);
  assert.equal((await prepareToss(s,request)).paymentOrderId,order.paymentOrderId);
  const approved={status:'DONE',orderId:order.paymentOrderId,paymentKey:'strict-payment-key',totalAmount:order.total,currency:'KRW',approvedAt:'2026-10-20T19:00:00+09:00'};
  let sentKey='';calls=0;globalThis.fetch=async(_url,init)=>{calls++;const key=(init?.headers as Record<string,string>)['Idempotency-Key'];if(sentKey)assert.equal(key,sentKey);else sentKey=key;return calls===1?Response.json({code:'TEMPORARY_ERROR'},{status:500}):Response.json(approved);};
  const body={orderId:order.paymentOrderId,paymentKey:approved.paymentKey,amount:order.total};
  await assert.rejects(()=>confirmToss(s,{...body,amount:1}));assert.equal(calls,0);
  const outsider=await createSession();const another=await linkKakao(outsider.session,'other-customer');await assert.rejects(()=>confirmToss(another.session,body));assert.equal(calls,0);
  await assert.rejects(()=>confirmToss(s,body));await Promise.all([confirmToss(s,body),confirmToss(s,body)]);await confirmToss(s,body);assert.equal(calls,2);assert.match(sentKey,/^[a-f0-9-]{36}$/);
  await assert.rejects(()=>confirmToss(s,{...body,paymentKey:'different'}));
  const partial={...approved,status:'PARTIAL_CANCELED',cancels:[{transactionKey:'strict-cancel-1',cancelAmount:1,cancelStatus:'DONE',canceledAt:'2026-10-20T20:00:00+09:00'}]};globalThis.fetch=async()=>Response.json(partial);
  await refreshToss(s,{orderId:order.paymentOrderId});await refreshToss(s,{orderId:order.paymentOrderId});assert.equal((await db.query('SELECT * FROM refunds')).rows.length,1);
  globalThis.fetch=async()=>Response.json({...partial,status:'CANCELED',cancels:[...partial.cancels,{transactionKey:'strict-cancel-2',cancelAmount:order.total-1,cancelStatus:'DONE',canceledAt:'2026-10-20T21:00:00+09:00'}]});await refreshToss(s,{orderId:order.paymentOrderId});assert.equal((await db.query('SELECT * FROM refunds')).rows.length,2);
  const saved=(await db.query<{status:string;total_amount:string}>('SELECT * FROM orders')).rows[0];assert.equal(saved.status,'canceled');assert.equal(Number(saved.total_amount),order.total);
  globalThis.fetch=async()=>Response.json(approved);await assert.rejects(()=>refreshToss(s,{orderId:order.paymentOrderId}));
  const retryRequest={items:[{variantId:v.id,quantity:1}],key:randomUUID()},first=await prepareToss(s,retryRequest);globalThis.fetch=async()=>Response.json({}, {status:400});await assert.rejects(()=>confirmToss(s,{orderId:first.paymentOrderId,paymentKey:'aborted-key',amount:first.total}));globalThis.fetch=async()=>Response.json({...approved,orderId:first.paymentOrderId,paymentKey:'aborted-key',status:'ABORTED',approvedAt:undefined});await refreshToss(s,{orderId:first.paymentOrderId});const retry=await prepareToss(s,retryRequest);assert.equal(retry.orderNumber,first.orderNumber);assert.notEqual(retry.paymentOrderId,first.paymentOrderId);
  process.env.TOSS_SECRET_KEY='live_sk_forbidden';assert.equal(providerConfig().tossConfigured,false);await assert.rejects(()=>prepareToss(s,request));
 }finally{globalThis.fetch=originalFetch;await db.close();globalThis.onepieceDb=undefined;}
});
