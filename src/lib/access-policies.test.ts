import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
process.env.LOCAL_DB_PATH='memory://';
process.env.VERCEL='0'; // These tests intentionally exercise local ERD persistence.
import {stableId} from './catalog-source';
import {getDb} from './db';
import {createSession,syncCart,updateCollection,catalog} from './shop-server';
import {linkVerifiedMember} from './providers';

test('optional Supabase RLS SQL isolates member rows and prevents direct browser writes to payments',async()=>{
 const db=await getDb();try{
  const one=(await testMember((await createSession()).session,'rls-one')).session;
  const two=(await testMember((await createSession()).session,'rls-two')).session;
  const p=(await catalog()).find(p=>p.available)!,v=p.variants.find(v=>v.available)!;
  await syncCart(one,[{variantId:v.id,quantity:1}]);await syncCart(two,[{variantId:v.id,quantity:2}]);
  await updateCollection(one,{action:'favorite',productId:p.id,enabled:true});
  await updateCollection(two,{action:'favorite',productId:p.id,enabled:true});
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE SQL STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO anon,authenticated;");
  await db.exec(await readFile('supabase/migrations/202610210003_access_policies.sql','utf8'));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[one.user_id]);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT * FROM profiles')).rows.length,1);
  assert.equal((await db.query('SELECT * FROM favorites')).rows.length,1);
  assert.equal((await db.query('SELECT * FROM carts')).rows.length,1);
  assert.equal((await db.query<{quantity:number}>('SELECT quantity FROM cart_items')).rows[0].quantity,1);
  await assert.rejects(()=>db.query('INSERT INTO favorites(user_id,product_id) VALUES($1,$2)',[two.user_id,p.id]));
  await assert.rejects(()=>db.exec("UPDATE payments SET status='DONE'"));
  await db.exec('RESET ROLE; SET ROLE anon');
  assert.equal((await db.query('SELECT id FROM products')).rows.length,366);
  await assert.rejects(()=>db.exec('SELECT * FROM profiles'));
  await db.exec('RESET ROLE');
 }finally{await db.close();globalThis.onepieceDb=undefined;}
});

function testMember(s:Parameters<typeof linkVerifiedMember>[0],subject:string){return linkVerifiedMember(s,{id:stableId('verified-unit-member',subject),name:'Unit member'});}
