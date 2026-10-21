import {getDb,verifySchema} from '../src/lib/db';
import {mkdir,writeFile} from 'node:fs/promises';
const literal=(v:unknown):string=>v===null?'NULL':typeof v==='boolean'?(v?'true':'false'):typeof v==='number'?String(v):"'"+(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")+"'";
async function main(){
 // Always export a fresh public fixture, never a user's live DB or historical baseline migration.
 process.env.LOCAL_DB_PATH='memory://';const db=await getDb();
 try{
  await verifySchema(db);await mkdir('supabase',{recursive:true});
  let sql='-- Public catalog only. No auth, member, cart, order, payment or behavior rows.\nBEGIN;\n';
  for(const table of ['categories','products','product_variants','product_images']){
   const rows=(await db.query<Record<string,unknown>>(`SELECT * FROM ${table}${table==='categories'?' ORDER BY parent_id NULLS FIRST,id':' ORDER BY id'}`)).rows;
   for(const row of rows){const keys=Object.keys(row);sql+=`INSERT INTO ${table} (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map(k=>literal(row[k])).join(',')}) ON CONFLICT DO NOTHING;\n`;}
   if(table!=='categories')sql+=`SELECT setval(pg_get_serial_sequence('${table}','id'),coalesce((SELECT max(id) FROM ${table}),1),true);\n`;
  }
  sql+='COMMIT;\n';await writeFile('supabase/seed.sql',sql);console.log('Fresh ERD13 catalog seed exported. No cloud project was changed.');
 }finally{await db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
