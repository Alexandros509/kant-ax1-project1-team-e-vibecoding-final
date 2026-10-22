import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { getDb } from './db';
import { publishedCatalog } from './published-catalog';
import {isReportEvent} from './analytics-contract';
import { catalogSource, sourceCategory, sourceOption } from './catalog-source';
import { imagePublicUrl } from './catalog-media';
import { storefrontProductName } from './catalog-adapter';
import { validateBasket, type BasketItem, type CatalogProduct } from './shop-model';

export type Session = {token_hash: string; anonymous_id: string; session_id: string; assignment_id: string; user_id: string | null; user_name?:string; consent: boolean; variant: 'A' | 'B'; snapshot_id: string};
type RuntimeSession = {session: Session; expires: number; events: Set<string>; guestCart: BasketItem[]};
declare global { var onepieceSessions: Map<string, RuntimeSession> | undefined; }
const sessions = () => globalThis.onepieceSessions ??= new Map<string, RuntimeSession>();
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function findSession(token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const row = sessions().get(tokenHash(token));
    if (!row || row.expires < Date.now()) { if (row) sessions().delete(row.session.token_hash); return null; }
    return row.session;
}
export async function createSession() {
    for (const [key, row] of sessions()) if (row.expires < Date.now()) sessions().delete(key);
    const token = randomBytes(32).toString('hex');
    const session: Session = {token_hash: tokenHash(token), anonymous_id: randomUUID(), session_id: randomUUID(), assignment_id: '', user_id: null, consent: false, variant: 'B', snapshot_id: (await catalogSource()).snapshot_id};
    sessions().set(session.token_hash, {session, expires: Date.now() + 30 * 86400000, events: new Set(), guestCart: []});
    return {token, session};
}
export function changeConsent(s: Session, consent: boolean) {
    const row = sessions().get(s.token_hash); if (!row) throw new Error('Session expired.');
    row.session.consent = consent; return {saved: true};
}
export function removeSession(s: Session) { sessions().delete(s.token_hash); }
export function rotateSession(s: Session, userId: string, name?:string, preserveCart=false) {
    const row = sessions().get(s.token_hash); if (!row) throw new Error('Session expired.');
    removeSession(s); const token = randomBytes(32).toString('hex'), session = {...s, token_hash: tokenHash(token), user_id: userId,user_name:name};
    sessions().set(session.token_hash, {...row, session, guestCart: preserveCart?row.guestCart:[]}); return {token, session};
}
export function guestCart(s: Session) { return sessions().get(s.token_hash)?.guestCart || []; }
export async function savedCart(s: Session): Promise<BasketItem[]> {
    if (!s.user_id || process.env.VERCEL==='1') return guestCart(s);
    return (await (await getDb()).query<{variantId: number; quantity: number}>('SELECT i.product_variant_id AS "variantId",i.quantity FROM cart_items i JOIN carts c ON c.id=i.cart_id WHERE c.user_id=$1 ORDER BY i.id', [s.user_id])).rows;
}
export async function catalog(): Promise<CatalogProduct[]> {
    if (process.env.VERCEL === '1') return publishedCatalog();
    const db = await getDb(), source = await catalogSource();
    const products = (await db.query<{id: number; name: string; category_id: string; detail: string; product_care: string; shipping: string; sale_price: number; list_price: number; is_new: boolean}>("SELECT p.* FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN categories parent ON parent.id=c.parent_id WHERE p.status='active' AND c.is_active AND (c.parent_id IS NULL OR parent.is_active) ORDER BY p.sort_order,p.id")).rows;
    const variants = (await db.query<{id: number; product_id: number; sku: string; size_label: string; stock_quantity: number; is_active: boolean}>('SELECT * FROM product_variants ORDER BY sort_order,id')).rows;
    const images = (await db.query<{product_id: number; storage_path: string}>('SELECT * FROM product_images ORDER BY sort_order,id')).rows;
    return Promise.all(products.map(async p => {
        const raw = source.products[p.id - 1], color = raw ? sourceOption(raw, raw.variants[0]).color : '';
        const options = variants.filter(v => v.product_id === p.id).map(v => ({id: v.id, productId: p.id, sku: v.sku, color, size: v.size_label, price: p.sale_price, available: v.is_active && v.stock_quantity > 0}));
        return {id: p.id, name: storefrontProductName(p.name), brand: 'ONEPIECE', category: raw ? sourceCategory(raw) : 'etc', categoryId: Number(p.category_id), color, price: p.sale_price, listPrice: p.list_price, available: options.some(v => v.available), images: await Promise.all(images.filter(i => i.product_id === p.id).map(i => imagePublicUrl(i.storage_path))), description: p.detail, careInfo: p.product_care, shippingInfo: p.shipping, isNew: p.is_new, sizeGuide: raw?.size_guide || {columns: [], rows: []}, variants: options, sourceUrl: raw?.source_url || ''};
    }));
}
export async function recordEvent(s: Session, body: Record<string, unknown>) {
    if (!s.consent) return {stored: false, forward: false};
    if (!isReportEvent(String(body.name))) throw new Error('Unsupported event.');
    const key = String(body.key || ''); if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid event ID.');
    const row = sessions().get(s.token_hash); if (!row || row.events.has(key)) return {stored: false, forward: false};
    if (row.events.size > 10000) row.events.clear(); row.events.add(key);
    return {stored: false, forward: true};
}
export async function syncCart(s: Session, value: unknown) {
    const items = Array.isArray(value) && value.length === 0 ? [] : validateBasket(value);
    if (!s.user_id || process.env.VERCEL==='1') {
        const row = sessions().get(s.token_hash); if (!row) throw new Error('Session expired.');
        row.guestCart = items; return {saved: true, localOnly: true};
    }
    const db = await getDb();
    return db.transaction(async tx => {
        await tx.query('SELECT id FROM profiles WHERE id=$1 FOR UPDATE', [s.user_id]);
        const cart = (await tx.query<{id: number}>('INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET updated_at=now() RETURNING id', [s.user_id])).rows[0];
        for (const i of items) {
            const row = (await tx.query<{stock_quantity: number; is_active: boolean; status: string; category_active: boolean; parent_active: boolean}>('SELECT v.stock_quantity,v.is_active,p.status,c.is_active AS category_active,coalesce(parent.is_active,true) AS parent_active FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id LEFT JOIN categories parent ON parent.id=c.parent_id WHERE v.id=$1', [i.variantId])).rows[0];
            if (!row || !row.is_active || row.status !== 'active' || !row.category_active || !row.parent_active || row.stock_quantity < i.quantity) throw new Error('This option is unavailable.');
        }
        await tx.query('DELETE FROM cart_items WHERE cart_id=$1', [cart.id]);
        for (const i of items) await tx.query('INSERT INTO cart_items(cart_id,product_variant_id,quantity) VALUES($1,$2,$3)', [cart.id, i.variantId, i.quantity]);
        return {saved: true};
    });
}
export async function collections(s: Session) {
    if (!s.user_id || process.env.VERCEL==='1') return {favorites: [] as number[], recent: [] as number[]};
    const db = await getDb();
    return {favorites: (await db.query<{product_id: number}>('SELECT product_id FROM favorites WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 100', [s.user_id])).rows.map(r => r.product_id), recent: (await db.query<{product_id: number}>('SELECT product_id FROM recent_product_views WHERE user_id=$1 ORDER BY last_viewed_at DESC,id LIMIT 12', [s.user_id])).rows.map(r => r.product_id)};
}
export async function updateCollection(s: Session, body: Record<string, unknown>) {
    if(process.env.VERCEL==='1')throw new Error('Saved lists require the member database connection.');
    if (!s.user_id) throw new Error('Please log in.');
    const id = Number(body.productId);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid product.');
    const db = await getDb();
    if (!(await db.query("SELECT p.id FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN categories parent ON parent.id=c.parent_id WHERE p.id=$1 AND p.status='active' AND c.is_active AND (c.parent_id IS NULL OR parent.is_active)", [id])).rows.length) throw new Error('Product unavailable.');
    if (body.action === 'favorite') {
        if (body.enabled === true) await db.query('INSERT INTO favorites(user_id,product_id) VALUES($1,$2) ON CONFLICT(user_id,product_id) DO NOTHING', [s.user_id, id]);
        else await db.query('DELETE FROM favorites WHERE user_id=$1 AND product_id=$2', [s.user_id, id]);
    } else if (body.action === 'recent-view') await db.query('INSERT INTO recent_product_views(user_id,product_id) VALUES($1,$2) ON CONFLICT(user_id,product_id) DO UPDATE SET last_viewed_at=now(),view_count=recent_product_views.view_count+1', [s.user_id, id]);
    else throw new Error('Invalid collection action.');
    return collections(s);
}
export async function checkout(s: Session, body: Record<string, unknown>) {
    if (!s.user_id) throw new Error('Please log in before continuing.');
    const items = validateBasket(body.items), key = String(body.key || '');
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid checkout key.');
    const input = body.delivery as Record<string, unknown> | undefined;
    const delivery = {name: String(input?.name || 'Test recipient').trim(), phone: String(input?.phone || '000-0000-0000').trim(), zipcode: String(input?.zipcode || '00000').trim(), address: String(input?.address || 'Test address (no shipping)').trim(), address2: String(input?.address2 || '').trim(), memo: String(input?.memo || '').trim()};
    if (!delivery.name || delivery.name.length > 100 || !/^[0-9+() -]{7,30}$/.test(delivery.phone) || !/^\d{5}$/.test(delivery.zipcode) || !delivery.address || delivery.address.length > 255 || delivery.address2.length > 255 || delivery.memo.length > 255) throw new Error('Please check your delivery details.');
    const db = await getDb();
    return db.transaction(async tx => {
        if (!(await tx.query('SELECT id FROM profiles WHERE id=$1 FOR UPDATE', [s.user_id])).rows.length) throw new Error('Account not found.');
        const old = (await tx.query<{id: string; order_number: string; total_amount: string; recipient_name: string; recipient_phone: string; postal_code: string; address_line1: string; address_line2: string; shipping_message: string}>('SELECT * FROM orders WHERE user_id=$1 AND idempotency_key=$2', [s.user_id, key])).rows[0];
        if (old) {
            const previous = (await tx.query<{variantId: number; quantity: number}>('SELECT product_variant_id AS "variantId",quantity FROM order_items WHERE order_id=$1 ORDER BY product_variant_id', [old.id])).rows;
            const oldDelivery = {name: old.recipient_name, phone: old.recipient_phone, zipcode: old.postal_code, address: old.address_line1, address2: old.address_line2 || '', memo: old.shipping_message || ''};
            if (JSON.stringify(previous) !== JSON.stringify(items) || JSON.stringify(oldDelivery) !== JSON.stringify(delivery)) throw new Error('This checkout key was used for different contents.');
            return {orderNumber: old.order_number, total: Number(old.total_amount), replayed: true};
        }
        let total = 0;
        const lines = [];
        for (const i of items) {
            const row = (await tx.query<{id: number; sku: string; size_label: string; product_id: number; stock_quantity: number; is_active: boolean; status: string; sale_price: number; name: string; storage_path: string; category_active: boolean; parent_active: boolean}>("SELECT v.*,p.name,p.sale_price,p.status,c.is_active AS category_active,coalesce(parent.is_active,true) AS parent_active,(SELECT storage_path FROM product_images WHERE product_id=p.id ORDER BY sort_order,id LIMIT 1) AS storage_path FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id LEFT JOIN categories parent ON parent.id=c.parent_id WHERE v.id=$1 FOR UPDATE OF v", [i.variantId])).rows[0];
            if (!row || !row.is_active || row.status !== 'active' || !row.category_active || !row.parent_active || row.stock_quantity < i.quantity) throw new Error('This item is sold out or unavailable.');
            total += row.sale_price * i.quantity; if (!Number.isSafeInteger(total)) throw new Error('Invalid order amount.');
            lines.push({...row, quantity: i.quantity});
        }
        const id = randomUUID(), orderNumber = 'TEST-' + randomUUID();
        await tx.query("INSERT INTO orders(id,user_id,order_number,idempotency_key,status,currency,subtotal_amount,shipping_fee,total_amount,recipient_name,recipient_phone,postal_code,address_line1,address_line2,shipping_message) VALUES($1,$2,$3,$4,'submitted','KRW',$5,0,$5,$6,$7,$8,$9,$10,$11)", [id, s.user_id, orderNumber, key, total, delivery.name, delivery.phone, delivery.zipcode, delivery.address, delivery.address2, delivery.memo]);
        for (const v of lines) await tx.query('INSERT INTO order_items(order_id,product_variant_id,product_name,option_text,sku,image_storage_path,unit_price,quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, v.id, v.name, v.size_label, v.sku, v.storage_path, v.sale_price, v.quantity]);
        return {orderNumber, total, replayed: false};
    });
}
export async function receipt(s: Session, number: string | null) {
    if (!s.user_id) throw new Error('Please log in.');
    const row = (await (await getDb()).query<{order_number: string; total_amount: string; status: string; payment_status: string}>("SELECT o.*, (SELECT status FROM payments WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1) AS payment_status FROM orders o WHERE o.order_number=$1 AND o.user_id=$2", [number, s.user_id])).rows[0];
    return row ? {order_number: row.order_number, total_amount: Number(row.total_amount), status: row.status === 'cancelled' ? 'canceled' : row.payment_status === 'DONE' ? 'paid' : 'pending'} : null;
}
