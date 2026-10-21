import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { catalogSource, sourceCategory, sourceOption } from './catalog-source';
import { CATALOG_CATEGORIES, catalogCategoryId } from './catalog-adapter';
import { imageStoragePath } from './catalog-media';

declare global { var onepieceDb: Promise<PGlite> | undefined; }
export const dbFolder = () => process.env.LOCAL_DB_PATH || path.join(process.cwd(), '.local', 'onepiece-erd13-media-v3');
export const schemaDefinition = () => readFile(path.join(process.cwd(), 'db/schema.sql'), 'utf8');
export const localAuthDefinition = () => readFile(path.join(process.cwd(), 'db/local-auth.sql'), 'utf8');
export function schemaColumns(sql: string) {
    return Object.fromEntries([...sql.matchAll(/CREATE TABLE "([a-z_]+)" \(([\s\S]*?)\);/g)].map(m => [m[1], [...m[2].matchAll(/^\s*"([a-z_][a-z0-9_]*)"\s/gm)].map(c => c[1])]));
}
export async function verifySchema(db: PGlite) {
    const expected = schemaColumns(await schemaDefinition());
    const tables = (await db.query<{table_name: string}>("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows;
    if (tables.length !== 13 || tables.some(t => !expected[t.table_name]))
        throw new Error('This DB uses an older/different ERD. Preserve it and select a fresh LOCAL_DB_PATH for the ERD13 catalog.');
    for (const table of tables) {
        const actual = (await db.query<{column_name: string}>("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table.table_name])).rows.map(c => c.column_name);
        if (JSON.stringify(actual) !== JSON.stringify(expected[table.table_name]))
            throw new Error('Unexpected ERD columns in ' + table.table_name);
    }
    return {tables: tables.length, columns: Object.values(expected).reduce((n, c) => n + c.length, 0)};
}
export function getDb() { return globalThis.onepieceDb ??= initialize(); }
async function initialize() {
    const folder = dbFolder();
    if (folder !== 'memory://') await mkdir(path.dirname(path.resolve(/*turbopackIgnore: true*/folder)), {recursive: true});
    const db = new PGlite(folder); await db.waitReady;
    try {
        const count = (await db.query<{n: number}>("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows[0].n;
        if (count === 0) await db.transaction(async tx => {
            await tx.exec(await localAuthDefinition());
            await tx.exec(await schemaDefinition());
            await seed(tx);
        });
        await verifySchema(db);
        const actual = (await db.query<{id: number}>('SELECT id FROM products ORDER BY id')).rows.map(p => p.id);
        const expected = (await catalogSource()).products.map((_, i) => i + 1);
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error('The configured DB contains a different catalog. Keep it as a backup and select a fresh LOCAL_DB_PATH.');
        return db;
    } catch (error) { await db.close(); globalThis.onepieceDb = undefined; throw error; }
}
export async function seed(db: Pick<PGlite, 'query'>) {
    for (const c of CATALOG_CATEGORIES)
        await db.query('INSERT INTO categories(id,parent_id,name,sort_order,is_active) VALUES($1,$2,$3,$4,true)', [c.id, c.parent_id, c.name, c.sort_order]);
    let variantId = 0;
    for (const [index, p] of (await catalogSource()).products.entries()) {
        const id = index + 1, price = Math.min(...p.variants.map(v => Number(v.price)));
        if (!Number.isSafeInteger(price) || price < 0) throw new Error('Invalid catalog price.');
        await db.query("INSERT INTO products(id,category_id,name,detail,product_care,shipping,list_price,sale_price,status,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$7,'active',$8)", [id, catalogCategoryId(sourceCategory(p)), p.title, p.material_origin_facts.join('\n'), 'Refer to the care label attached to each garment.', 'Test orders only. No real charges or shipping.', price, index]);
        for (const [i, v] of p.variants.entries()) {
            const option = sourceOption(p, v);
            await db.query('INSERT INTO product_variants(id,product_id,sku,size_label,stock_quantity,is_active,sort_order) VALUES($1,$2,$3,$4,$5,true,$6)', [++variantId, id, v.sku, option.size, v.available ? 100000 : 0, i]);
        }
        for (const [i, image] of p.image_references.entries()) {
            const name = image.url.split('/').pop()!;
            const info = await stat(path.join(process.cwd(), 'public', image.url));
            const role = i === 0 ? 'main' : i === 1 ? 'hover' : name.includes('Model') ? 'model' : 'detail';
            await db.query('INSERT INTO product_images(product_id,storage_path,original_name,mime_type,file_size,role,sort_order,alt_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, imageStoragePath(id, image.url), name, 'image/png', info.size, role, i, p.title]);
        }
    }
    for (const table of ['products', 'product_variants'])
        await db.query(`SELECT setval(pg_get_serial_sequence('${table}','id'),(SELECT max(id) FROM ${table}),true)`);
}
