import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.env.LOCAL_DB_PATH='memory://';
import {getDb,verifySchema,schemaColumns} from './db';
import {catalogSource} from './catalog-source';
import {catalog,createSession,findSession,syncCart,savedCart,collections,updateCollection,checkout,receipt,changeConsent,recordEvent} from './shop-server';
import {linkKakao,startKakao,finishKakao,prepareToss,confirmToss,refreshToss,providerConfig} from './providers';

test('current shared ERD has 13 public tables, 125 columns and 17 relationships; catalog has 366 local-image products',async()=>{
 const db=await getDb();try{
  assert.deepEqual(await verifySchema(db),{tables:13,columns:125});
  const exported=schemaColumns(await readFile('db/erdcloud-source.sql','utf8'));delete exported.auth_users;
  const actual=(await db.query<{table_name:string;column_name:string}>("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  for(const [table,columns]of Object.entries(exported))assert.deepEqual(actual.filter(r=>r.table_name===table).map(r=>r.column_name),columns);
  assert.equal((await db.query<{n:number}>("SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE c.contype='f' AND n.nspname='public'")).rows[0].n,17);
  assert.equal((await db.query<{n:number}>('SELECT count(*)::int AS n FROM auth.users')).rows[0].n,0);
  for(const table of ['customers','brands','product_colors','inventories','refunds','experiments','user_events','local_sessions','auth_users'])assert.equal((await db.query<{t:string|null}>('SELECT to_regclass($1)::text AS t',[table])).rows[0].t,null);
  const source=await catalogSource(),products=await catalog();assert.equal(products.length,366);assert.equal(source.products.length,366);
  assert.equal(products.reduce((n,p)=>n+p.variants.length,0),1280);assert.equal(products.reduce((n,p)=>n+p.images.length,0),1478);
  assert.equal(new Set(products.flatMap(p=>p.images)).size,59);assert.ok(products.every(p=>p.images.every(url=>url.startsWith('/images/products/'))));
  const paths=(await db.query<{storage_path:string;file_size:string}>('SELECT storage_path,file_size FROM product_images')).rows;
  assert.equal(new Set(paths.map(r=>r.storage_path)).size,1478);assert.ok(paths.every(r=>Number(r.file_size)>0));
  await assert.rejects(()=>db.exec('UPDATE product_variants SET stock_quantity=-1'));
  await assert.rejects(()=>db.exec('UPDATE products SET sale_price=list_price+1'));
  await assert.rejects(()=>db.query('INSERT INTO categories(id,parent_id,name) VALUES($1,$1,$1)',['cycle']));
  await assert.rejects(()=>db.query('INSERT INTO categories(id,parent_id,name) VALUES($1,$2,$1)',['third-level','11']));
 }finally{await db.close();globalThis.onepieceDb=undefined;}
});

test('guest cart stays outside member tables; verified login merges once, member lists isolate owners and orders preserve snapshots',async()=>{
 const db=await getDb();try{
  const product=(await catalog()).find(p=>p.available)!,variant=product.variants.find(v=>v.available)!;
  const guest=await createSession();await syncCart(guest.session,[{variantId:variant.id,quantity:2}]);
  assert.equal((await db.query('SELECT * FROM carts')).rows.length,0);
  const login=await linkKakao(guest.session,'cart-owner'),s=login.session;assert.equal(await findSession(guest.token),null);
  assert.deepEqual(await savedCart(s),[{variantId:variant.id,quantity:2}]);
  const nextGuest=await createSession();await syncCart(nextGuest.session,[{variantId:variant.id,quantity:3}]);const second=await linkKakao(nextGuest.session,'cart-owner');
  assert.equal(second.session.user_id,s.user_id);assert.deepEqual(await savedCart(second.session),[{variantId:variant.id,quantity:5}]);
  const other=await linkKakao((await createSession()).session,'different-owner');assert.deepEqual(await savedCart(other.session),[]);
  await updateCollection(s,{action:'favorite',productId:product.id,enabled:true});await updateCollection(s,{action:'favorite',productId:product.id,enabled:true});
  await updateCollection(s,{action:'recent-view',productId:product.id});await updateCollection(s,{action:'recent-view',productId:product.id});
  assert.deepEqual(await collections(s),{favorites:[product.id],recent:[product.id]});assert.deepEqual(await collections(other.session),{favorites:[],recent:[]});
  assert.equal(Number((await db.query<{view_count:string}>('SELECT view_count FROM recent_product_views')).rows[0].view_count),2);
  await assert.rejects(async()=>updateCollection((await createSession()).session,{action:'favorite',productId:product.id,enabled:true}));
  const request={items:[{variantId:variant.id,quantity:2}],key:randomUUID(),total:1};const order=await checkout(s,request);
  assert.equal(order.total,variant.price*2);assert.equal((await checkout(s,request)).orderNumber,order.orderNumber);
  await assert.rejects(()=>checkout(s,{...request,items:[{variantId:variant.id,quantity:1}]}));await assert.rejects(()=>checkout(s,{...request,delivery:{phone:'bad'}}));
  const snapshot=(await db.query<{product_name:string;line_total:string}>('SELECT product_name,line_total FROM order_items')).rows[0];
  await db.query("UPDATE products SET name='Renamed product' WHERE id=$1",[product.id]);assert.equal((await db.query<{product_name:string}>('SELECT product_name FROM order_items')).rows[0].product_name,snapshot.product_name);
  assert.equal(Number(snapshot.line_total),variant.price*2);await assert.rejects(()=>db.exec('UPDATE order_items SET line_total=1'));await assert.rejects(()=>db.exec('UPDATE orders SET total_amount=1'));
  assert.equal(await receipt(other.session,order.orderNumber),null);assert.equal((await receipt(s,order.orderNumber))?.status,'pending');
  assert.deepEqual(await recordEvent(s,{name:'view_item',key:randomUUID()}),{stored:false,forward:false});changeConsent(s,true);const event=randomUUID();assert.equal((await recordEvent(s,{name:'view_item',key:event})).forward,true);assert.equal((await recordEvent(s,{name:'view_item',key:event})).forward,false);
  await assert.rejects(()=>recordEvent(s,{name:'purchase',key:randomUUID()}));
  await db.query('UPDATE categories SET is_active=false WHERE id=(SELECT parent_id FROM categories WHERE id=$1)',[String(product.categoryId)]);
  assert.ok(!(await catalog()).some(p=>p.id===product.id));await assert.rejects(()=>syncCart(s,[{variantId:variant.id,quantity:1}]));
 }finally{await db.close();globalThis.onepieceDb=undefined;}
});

test('Kakao state is bound/one-time and Toss uses new payment/transaction fields with safe approval, retry and cancellation reconciliation',async()=>{
 const db=await getDb(),originalFetch=globalThis.fetch;
 const environmentKeys=['APP_ORIGIN','KAKAO_REST_API_KEY','KAKAO_CLIENT_SECRET','TOSS_CLIENT_KEY','TOSS_SECRET_KEY'] as const;
 const originalEnvironment=environmentKeys.map(key=>[key,process.env[key]] as const);
 try{
  // Build-host credentials and callback settings must never control mocked provider tests.
  process.env.APP_ORIGIN='https://onepiece.test';process.env.KAKAO_REST_API_KEY='unit-test';process.env.KAKAO_CLIENT_SECRET='unit-secret';process.env.TOSS_CLIENT_KEY='test_ck_unit';process.env.TOSS_SECRET_KEY='test_sk_unit';
  assert.equal(providerConfig().tossConfigured,true);
  const guest=await createSession(),other=await createSession();const url=new URL(await startKakao(guest.session,'/app-preview'));let calls=0;
  assert.equal(url.searchParams.get('redirect_uri'),'https://onepiece.test/api/auth/kakao/callback');
  globalThis.fetch=async input=>{calls++;return Response.json(String(input).includes('/token')?{access_token:'mock'}:{id:123456});};
  await assert.rejects(()=>finishKakao(other.session,url.searchParams.get('state')!,'code'));assert.equal(calls,0);
  const login=await finishKakao(guest.session,url.searchParams.get('state')!,'code'),s=login.session;assert.equal(login.returnTo,'/app-preview');assert.equal(await findSession(guest.token),null);await assert.rejects(()=>finishKakao(s,url.searchParams.get('state')!,'code'));
  const product=(await catalog()).find(p=>p.available)!,variant=product.variants.find(v=>v.available)!;
  const request={items:[{variantId:variant.id,quantity:1}],key:randomUUID()};const order=await prepareToss(s,request);assert.equal((await prepareToss(s,request)).paymentOrderId,order.paymentOrderId);
  assert.equal(order.successUrl,'https://onepiece.test/checkout/success');assert.equal(order.failUrl,'https://onepiece.test/checkout/fail');
  const approved={status:'DONE',orderId:order.paymentOrderId,paymentKey:'p'.repeat(200),totalAmount:order.total,balanceAmount:order.total,currency:'KRW',lastTransactionKey:'approval-1',approvedAt:'2026-10-21T18:00:00+09:00',method:'카드'};
  const body={orderId:order.paymentOrderId,paymentKey:approved.paymentKey,amount:order.total};let sentKey='';calls=0;
  globalThis.fetch=async(_url,init)=>{calls++;const key=(init?.headers as Record<string,string>)['Idempotency-Key'];if(sentKey)assert.equal(key,sentKey);else sentKey=key;return calls===1?Response.json({code:'TEMPORARY_ERROR'},{status:500}):Response.json(approved);};
  await assert.rejects(()=>confirmToss(s,{...body,amount:1}));assert.equal(calls,0);
  const outsider=await linkKakao(other.session,'other-customer');await assert.rejects(()=>confirmToss(outsider.session,body));assert.equal(calls,0);
  await assert.rejects(()=>confirmToss(s,body));await Promise.all([confirmToss(s,body),confirmToss(s,body)]);await confirmToss(s,body);assert.equal(calls,2);assert.match(sentKey,/^[a-f0-9-]{36}$/);
  assert.equal((await db.query<{payment_key:string}>('SELECT payment_key FROM payments')).rows[0].payment_key.length,200);
  assert.equal((await db.query('SELECT * FROM payment_transactions')).rows.length,1);assert.equal((await receipt(s,order.orderNumber))?.status,'paid');
  await assert.rejects(()=>confirmToss(s,{...body,paymentKey:'different'}));
  const partial={...approved,status:'PARTIAL_CANCELED',balanceAmount:order.total-1,lastTransactionKey:'cancel-1',cancels:[{transactionKey:'cancel-1',cancelAmount:1,cancelStatus:'DONE',canceledAt:'2026-10-21T19:00:00+09:00'}]};globalThis.fetch=async()=>Response.json(partial);
  await refreshToss(s,{orderId:order.paymentOrderId});await refreshToss(s,{orderId:order.paymentOrderId});assert.equal((await db.query('SELECT * FROM payment_transactions')).rows.length,2);
  globalThis.fetch=async()=>Response.json({...partial,status:'CANCELED',balanceAmount:0,lastTransactionKey:'cancel-2',cancels:[...partial.cancels,{transactionKey:'cancel-2',cancelAmount:order.total-1,cancelStatus:'DONE',canceledAt:'2026-10-21T20:00:00+09:00'}]});
  await refreshToss(s,{orderId:order.paymentOrderId});assert.equal((await db.query('SELECT * FROM payment_transactions')).rows.length,3);
  assert.equal((await receipt(s,order.orderNumber))?.status,'canceled');assert.equal(Number((await db.query<{total_amount:string}>('SELECT total_amount FROM payments')).rows[0].total_amount),order.total);
  globalThis.fetch=async()=>Response.json(approved);await assert.rejects(()=>refreshToss(s,{orderId:order.paymentOrderId}));
  const retryRequest={items:[{variantId:variant.id,quantity:1}],key:randomUUID()},first=await prepareToss(s,retryRequest);globalThis.fetch=async()=>Response.json({code:'FAIL'},{status:400});await assert.rejects(()=>confirmToss(s,{orderId:first.paymentOrderId,paymentKey:'aborted-key',amount:first.total}));
  globalThis.fetch=async()=>Response.json({status:'ABORTED',orderId:first.paymentOrderId,paymentKey:'aborted-key',totalAmount:first.total,currency:'KRW'});await refreshToss(s,{orderId:first.paymentOrderId});const retry=await prepareToss(s,retryRequest);assert.equal(retry.orderNumber,first.orderNumber);assert.notEqual(retry.paymentOrderId,first.paymentOrderId);
  process.env.TOSS_SECRET_KEY='live_sk_forbidden';assert.equal(providerConfig().tossConfigured,false);await assert.rejects(()=>prepareToss(s,request));
 }finally{
  globalThis.fetch=originalFetch;
  for(const [key,value]of originalEnvironment){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  await db.close();globalThis.onepieceDb=undefined;
 }
});
