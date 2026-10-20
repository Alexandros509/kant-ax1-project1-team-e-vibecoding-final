import {getDb,schemaDefinition,verifySchema} from '../src/lib/db';
import {mkdir,writeFile} from 'node:fs/promises';
const literal=(v:unknown):string=>v===null?'NULL':typeof v==='boolean'?(v?'true':'false'):typeof v==='number'?String(v):"'"+(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")+"'";
async function main(){const db=await getDb();try{
 await verifySchema(db);await mkdir('supabase/migrations',{recursive:true});await writeFile('supabase/migrations/202610200001_erd_baseline.sql',await schemaDefinition());
 let sql='-- Catalog only. No customer, session, order, payment or analytics rows.\nBEGIN;\n';
 for(const table of ['brands','categories','products','product_colors','product_variants','inventories','product_images','product_categories','collections','collection_products','archives','archive_images','stores','pages','product_relations']){
  const rows=(await db.query<Record<string,unknown>>(`SELECT * FROM ${table}${table==='categories'?' ORDER BY parent_id NULLS FIRST,id':''}`)).rows;
  for(const row of rows){if(table==='inventories')row.reserved=0;const keys=Object.keys(row);sql+=`INSERT INTO ${table} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(k=>literal(row[k])).join(',')}) ON CONFLICT DO NOTHING;\n`;}
 }sql+='COMMIT;\n';await writeFile('supabase/seed.sql',sql);console.log('ERD baseline and catalog seed exported. Cloud auth/RLS requires separate setup.');
 }finally{await db.close();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
