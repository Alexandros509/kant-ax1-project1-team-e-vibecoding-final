import {PGlite} from '@electric-sql/pglite';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
import {dbFolder,schemaDefinition,seed,verifySchema} from '../src/lib/db';
async function main(){
 if(!process.argv.includes('--confirm-local-reset'))throw new Error('An explicit --confirm-local-reset flag is required. Back up the stopped local database first.');
 const target=path.resolve(dbFolder()),expected=path.resolve('.local','onepiece-db');if(target!==expected)throw new Error('Reset is restricted to this project .local/onepiece-db.');
 await mkdir(path.dirname(target),{recursive:true});
 console.log('Resetting verified local database:',target);const db=new PGlite(target);
 try{await db.transaction(async tx=>{await tx.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS auth CASCADE;');await tx.exec(await schemaDefinition());await seed(tx);});console.log(await verifySchema(db));console.log((await db.query('SELECT (SELECT count(*) FROM products) AS products,(SELECT count(*) FROM product_colors) AS colors,(SELECT count(*) FROM product_variants) AS variants,(SELECT count(*) FROM product_images) AS images')).rows[0]);}finally{await db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
