import {getDb,schemaDefinition,verifySchema} from '../src/lib/db';
import {mkdir,writeFile} from 'node:fs/promises';
async function main(){const db=await getDb();try{const count=await verifySchema(db);await mkdir('docs/erd',{recursive:true});await writeFile('docs/erd/onepiece-site-erd.sql',await schemaDefinition());console.log('Exact ERD structure exported:',count);}finally{await db.close();}}
main().catch(error=>{console.error(error);process.exitCode=1;});
