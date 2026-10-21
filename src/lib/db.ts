import {PGlite} from '@electric-sql/pglite';
import {migrateTossPaymentKey} from './db-migrations';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {catalogSource,stableId,categoryGroups,sourceCategory,sourceOption} from './catalog-source';
declare global {var onepieceDb:Promise<PGlite>|undefined;}
export const dbFolder=()=>process.env.LOCAL_DB_PATH||path.join(process.cwd(),'.local','onepiece-db');
export async function schemaDefinition(){return readFile(path.join(process.cwd(),'db','schema.sql'),'utf8');}
export function schemaColumns(sql:string){return Object.fromEntries([...sql.matchAll(/CREATE TABLE "([a-z_]+)" \(([\s\S]*?)\);/g)].map(m=>[m[1],[...m[2].matchAll(/^\s*"([a-z_]+)"\s/gm)].map(c=>c[1])]));}
export async function verifySchema(db:PGlite){
 const expected=schemaColumns(await schemaDefinition());const tables=(await db.query<{table_schema:string;table_name:string}>("SELECT table_schema,table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE' ORDER BY table_name")).rows;
 if(tables.length!==Object.keys(expected).length||tables.some(t=>t.table_schema!=='public'||!expected[t.table_name]))throw new Error('The local database does not match the selected ERD. Run the explicit reset script after backing up.');
 for(const table of tables){const cols=(await db.query<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table.table_name])).rows.map(c=>c.column_name);if(JSON.stringify(cols)!==JSON.stringify(expected[table.table_name]))throw new Error('Unexpected columns in '+table.table_name);}
 return {tables:tables.length,columns:Object.values(expected).reduce((n,c)=>n+c.length,0)};
}
export async function getDb(){globalThis.onepieceDb??=initialize();return globalThis.onepieceDb;}
async function initialize(){
 const folder=dbFolder();if(folder!=='memory://')await mkdir(path.dirname(path.resolve(/*turbopackIgnore: true*/folder)),{recursive:true});
 const db=new PGlite(folder);await db.waitReady;
 try{
  const count=(await db.query<{n:number}>("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') AND table_type='BASE TABLE'")).rows[0].n;
  if(count===0)await db.transaction(async tx=>{await tx.exec(await schemaDefinition());await seed(tx);});
  await verifySchema(db);await migrateTossPaymentKey(db);return db;
 }catch(error){await db.close();globalThis.onepieceDb=undefined;throw error;}
}
export async function seed(db:Pick<PGlite,'query'>){
 const raw=await catalogSource();
 for(const [index,[parent,children]] of categoryGroups.entries()){
  const parentId=stableId('category',parent);await db.query('INSERT INTO categories(id,parent_id,slug,name,sort_order) VALUES($1,NULL,$2,$2,$3)',[parentId,parent,index]);
  for(const [i,child] of children.entries())await db.query('INSERT INTO categories(id,parent_id,slug,name,sort_order) VALUES($1,$2,$3,$4,$5)',[stableId('category',child),parentId,child.replaceAll(' ','-'),child,i]);
 }
 for(const [index,p] of raw.products.entries()){
  const brand=stableId('brand',p.vendor),product=stableId('product',p.vendor+'|'+p.title),color=stableId('color',p.id);
  await db.query('INSERT INTO brands(id,code,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[brand,p.vendor.toLowerCase().replaceAll(' ','-'),p.vendor]);
  await db.query("INSERT INTO products(id,brand_id,style_code,name,description,status,care,tags) VALUES($1,$2,$3,$4,NULL,'active',$5,$6) ON CONFLICT DO NOTHING",[product,brand,'DEMO-'+product.slice(0,8),p.title,'Refer to the care label attached to each garment.',JSON.stringify(p.tags)]);
  await db.query('INSERT INTO product_categories(product_id,category_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[product,stableId('category',sourceCategory(p))]);
  await db.query('INSERT INTO product_colors(id,product_id,handle,color_name,color_hex,technical,size_guide,sort_order) VALUES($1,$2,$3,$4,NULL,$5,$6,$7)',[color,product,p.handle,sourceOption(p,p.variants[0]).color,p.material_origin_facts.join('\n'),JSON.stringify(p.size_guide),index]);
  for(const [i,image] of p.image_references.entries())await db.query('INSERT INTO product_images(id,product_color_id,url,role,alt,sort_order) VALUES($1,$2,$3,$4,$5,$6)',[stableId('image',p.id+'|'+i),color,image.url,i===0?'main':'detail',p.title,i]);
  for(const v of p.variants){
   const id=stableId('variant',v.id),price=Number(v.price);if(!Number.isSafeInteger(price)||price<0)throw new Error('Invalid source price.');
   await db.query("INSERT INTO product_variants(id,product_color_id,sku,size,price,currency,is_active) VALUES($1,$2,$3,$4,$5,'KRW',true)",[id,color,'DEMO-'+v.id,sourceOption(p,v).size,price]);
   await db.query('INSERT INTO inventories(variant_id,on_hand,reserved,updated_at) VALUES($1,$2,0,now())',[id,v.available?100000:0]);
  }
 }
}
