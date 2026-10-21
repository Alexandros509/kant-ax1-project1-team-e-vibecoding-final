import {getDb,verifySchema,schemaColumns,schemaDefinition} from '../src/lib/db';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
async function main(){const db=await getDb();try{
 const structure=await verifySchema(db),source=await readFile('db/erdcloud-source.sql','utf8');const tables=schemaColumns(await schemaDefinition()),counts:Record<string,number>={};
 for(const table of Object.keys(tables).sort())counts[table]=(await db.query<{n:number}>(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n;
 const foreignKeys=(await db.query<{n:number}>("SELECT count(*)::int AS n FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE c.contype='f' AND n.nspname='public'")).rows[0].n;
 const report={source:'https://www.erdcloud.com/d/xsTNMswWjSpfBkN5L',sourceSha256:createHash('sha256').update(source).digest('hex'),verifiedAt:new Date().toISOString(),...structure,foreignKeys,tableColumns:tables,rowCounts:counts};
 await mkdir('docs/erd',{recursive:true});await writeFile('docs/erd/strict-schema-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({tables:structure.tables,columns:structure.columns,foreignKeys,counts}));
 }finally{await db.close();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
