import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { tossTestKeys } from './toss-config';
import { checkout, type Session } from './shop-server';

type Attempt = {id: string; order_id: string; toss_order_id: string; payment_key: string | null; confirm_idempotency_key: string; amount: string; status: string; order_status: string; order_number: string; order_total: string};
type Payment = {status: string; orderId: string; paymentKey: string; totalAmount: number; currency: string; balanceAmount?: number; method?: string; requestedAt?: string; approvedAt?: string; lastTransactionKey?: string; receipt?: {url?: string}; card?: {approveNo?: string}; cancels?: {transactionKey: string; cancelAmount: number; cancelStatus: string; canceledAt: string; cancelReason?: string}[]};
const states = new Set(['READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT', 'DONE', 'CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED']);
const headers = () => ({Authorization: 'Basic ' + Buffer.from(tossTestKeys().secretKey + ':').toString('base64'), 'Content-Type': 'application/json'});
const inFlight = new Map<string, Promise<{orderNumber: string; total: number; status?: string}>>();
export async function createPaymentAttempt(s: Session, body: Record<string, unknown>) {
    const order = await checkout(s, body), db = await getDb();
    const attempt = await db.transaction(async tx => {
        const current = (await tx.query<{id: string; status: string}>('SELECT id,status FROM orders WHERE order_number=$1 AND user_id=$2 FOR UPDATE', [order.orderNumber, s.user_id])).rows[0];
        if (!current || current.status !== 'submitted') throw new Error('This order cannot start another payment.');
        const existing = (await tx.query<{id: string; toss_order_id: string; status: string}>("SELECT id,toss_order_id,status FROM payments WHERE order_id=$1 AND status NOT IN ('ABORTED','EXPIRED')", [current.id])).rows[0];
        if (existing) {
            if (!['READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT'].includes(existing.status)) throw new Error('This order already has a completed payment.');
            return existing;
        }
        const id = randomUUID(), tossOrder = 'TEST-' + id;
        return (await tx.query<{id: string; toss_order_id: string}>("INSERT INTO payments(id,order_id,toss_order_id,confirm_idempotency_key,total_amount) VALUES($1,$2,$3,$4,$5) RETURNING id,toss_order_id", [id, current.id, tossOrder, randomUUID(), order.total])).rows[0];
    });
    return {...order, paymentOrderId: attempt.toss_order_id};
}
async function owned(s: Session, orderId: string) {
    if (!s.user_id || !/^TEST-[a-f0-9-]{36}$/.test(orderId)) throw new Error('Invalid payment reference.');
    const attempt = (await (await getDb()).query<Attempt>("SELECT p.*,p.total_amount AS amount,o.order_number,o.status AS order_status,o.total_amount AS order_total FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.toss_order_id=$1 AND o.user_id=$2 AND p.provider='toss' AND p.environment='test' AND p.currency='KRW'", [orderId, s.user_id])).rows[0];
    if (!attempt) throw new Error('The payment account or reference does not match.');
    return attempt;
}
function time(value: string) { if (!Number.isFinite(Date.parse(value))) throw new Error('Invalid payment time.'); return value; }
function reference(value: unknown, maximum: number) { return typeof value === 'string' && value.length > 0 && value.length <= maximum; }
async function storeVerified(s: Session, a: Attempt, p: Payment) {
    if (!states.has(p.status) || p.orderId !== a.toss_order_id || p.paymentKey !== a.payment_key || !Number.isSafeInteger(p.totalAmount) || p.totalAmount !== Number(a.amount) || p.totalAmount !== Number(a.order_total) || p.currency !== 'KRW') throw new Error('The payment confirmation does not match this order.');
    if (p.balanceAmount !== undefined && (!Number.isSafeInteger(p.balanceAmount) || p.balanceAmount < 0 || p.balanceAmount > p.totalAmount)) throw new Error('Invalid payment balance.');
    if (p.lastTransactionKey !== undefined && !reference(p.lastTransactionKey, 64)) throw new Error('Invalid transaction key.');
    const db = await getDb();
    await db.transaction(async tx => {
        const latest = (await tx.query<{status: string; balance_amount: string | null}>('SELECT status,balance_amount FROM payments WHERE id=$1 FOR UPDATE', [a.id])).rows[0];
        if ((latest.status === 'CANCELED' && p.status !== 'CANCELED') || (latest.status === 'PARTIAL_CANCELED' && !['CANCELED', 'PARTIAL_CANCELED'].includes(p.status)) || (latest.status === 'DONE' && ['READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT', 'ABORTED', 'EXPIRED'].includes(p.status))) throw new Error('A newer payment status has already been recorded.');
        if (['CANCELED', 'PARTIAL_CANCELED'].includes(latest.status) && latest.balance_amount !== null && p.balanceAmount !== undefined && p.balanceAmount > Number(latest.balance_amount)) throw new Error('A newer payment balance has already been recorded.');
        const transaction = async (key: string, kind: 'APPROVAL' | 'CANCEL', amount: number, at: string, reason: string | null, idempotency: string | null) => {
            const old = (await tx.query<{payment_id: string; transaction_type: string; amount: string}>('SELECT payment_id,transaction_type,amount FROM payment_transactions WHERE transaction_key=$1', [key])).rows[0];
            if (old) {
                if (old.payment_id !== a.id || old.transaction_type !== kind || Number(old.amount) !== amount) throw new Error('A transaction reference was reused.');
                return;
            }
            await tx.query('INSERT INTO payment_transactions(payment_id,transaction_key,transaction_type,status,amount,balance_amount,occurred_at,approval_number,cancel_reason,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [a.id, key, kind, p.status, amount, p.balanceAmount ?? null, time(at), kind === 'APPROVAL' && p.card?.approveNo ? p.card.approveNo.slice(0, 8) : null, reason?.slice(0, 200) || null, idempotency]);
        };
        if (p.status === 'DONE') {
            if (!p.approvedAt || !reference(p.lastTransactionKey, 64)) throw new Error('Approval transaction metadata is missing.');
            await transaction(p.lastTransactionKey!, 'APPROVAL', p.totalAmount, p.approvedAt, null, a.confirm_idempotency_key);
        }
        for (const cancel of p.cancels || []) if (cancel.cancelStatus === 'DONE') {
            if (!['CANCELED', 'PARTIAL_CANCELED'].includes(p.status) || !reference(cancel.transactionKey, 64) || !Number.isSafeInteger(cancel.cancelAmount) || cancel.cancelAmount <= 0 || cancel.cancelAmount > p.totalAmount) throw new Error('Invalid cancellation transaction.');
            await transaction(cancel.transactionKey, 'CANCEL', cancel.cancelAmount, cancel.canceledAt, cancel.cancelReason || null, null);
        }
        const canceled = Number((await tx.query<{n: string}>("SELECT coalesce(sum(amount),0) AS n FROM payment_transactions WHERE payment_id=$1 AND transaction_type='CANCEL'", [a.id])).rows[0].n);
        if (canceled > p.totalAmount || (p.status === 'CANCELED' && canceled !== p.totalAmount) || (p.status === 'PARTIAL_CANCELED' && (canceled <= 0 || canceled >= p.totalAmount))) throw new Error('Cancellation totals do not match the payment.');
        if (['CANCELED', 'PARTIAL_CANCELED'].includes(p.status) && p.balanceAmount !== undefined && p.balanceAmount !== p.totalAmount - canceled) throw new Error('Cancellation balance does not match the verified transactions.');
        await tx.query('UPDATE payments SET status=$1,balance_amount=coalesce($2,balance_amount),method=coalesce($3,method),requested_at=coalesce($4,requested_at),approved_at=coalesce($5,approved_at),last_transaction_key=coalesce($6,last_transaction_key),receipt_url=coalesce($7,receipt_url),failure_code=NULL,failure_message=NULL,updated_at=now() WHERE id=$8', [p.status, p.balanceAmount ?? null, p.method?.slice(0, 30) || null, p.requestedAt ? time(p.requestedAt) : null, p.approvedAt ? time(p.approvedAt) : null, p.lastTransactionKey || null, p.receipt?.url || null, a.id]);
        if (p.status === 'DONE' && latest.status !== 'DONE') await tx.query('DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=$1)', [s.user_id]);
        if (p.status === 'CANCELED') await tx.query("UPDATE orders SET status='cancelled',updated_at=now() WHERE id=$1", [a.order_id]);
    });
    return {orderNumber: a.order_number, total: Number(a.amount), status: p.status};
}
export async function approvePayment(s: Session, body: Record<string, unknown>) {
    const orderId = String(body.orderId || ''), paymentKey = String(body.paymentKey || ''), amount = Number(body.amount);
    if (!reference(paymentKey, 200) || !Number.isSafeInteger(amount)) throw new Error('Invalid payment request.');
    const a = await owned(s, orderId);
    if (Number(a.amount) !== amount || Number(a.order_total) !== amount) throw new Error('The order amount does not match.');
    if (a.payment_key && a.payment_key !== paymentKey) throw new Error('The payment reference does not match.');
    if (a.status === 'DONE' && a.order_status === 'submitted') return {orderNumber: a.order_number, total: amount};
    if (a.order_status !== 'submitted' || !['READY', 'IN_PROGRESS'].includes(a.status)) throw new Error('This payment cannot be approved.');
    const key = JSON.stringify([s.user_id, orderId, paymentKey, amount]);
    if (inFlight.has(key)) return inFlight.get(key)!;
    const task = (async () => {
        const bound = await (await getDb()).query('UPDATE payments SET payment_key=$1,updated_at=now() WHERE id=$2 AND (payment_key IS NULL OR payment_key=$1) RETURNING id', [paymentKey, a.id]);
        if (!bound.rows.length) throw new Error('The payment reference does not match.'); a.payment_key = paymentKey;
        let result = await fetch('https://api.tosspayments.com/v1/payments/confirm', {method: 'POST', headers: {...headers(), 'Idempotency-Key': a.confirm_idempotency_key}, body: JSON.stringify({orderId, paymentKey, amount}), signal: AbortSignal.timeout(20000)});
        let payment = await result.json();
        if (!result.ok && payment.code === 'ALREADY_PROCESSED_PAYMENT') { result = await fetch('https://api.tosspayments.com/v1/payments/orders/' + encodeURIComponent(orderId), {headers: headers(), signal: AbortSignal.timeout(15000)}); payment = await result.json(); }
        if (!result.ok || payment.status !== 'DONE') {
            await (await getDb()).query('UPDATE payments SET failure_code=$1,failure_message=$2,updated_at=now() WHERE id=$3', [String(payment.code || 'CONFIRM_FAILED').slice(0, 100), 'Test payment confirmation could not be completed.', a.id]);
            throw new Error('We could not confirm your payment. Please try again.');
        }
        return storeVerified(s, a, payment);
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, task); return task;
}
export async function reconcilePayment(s: Session, body: Record<string, unknown>) {
    const orderId = String(body.orderId || ''), a = await owned(s, orderId);
    const response = await fetch('https://api.tosspayments.com/v1/payments/orders/' + encodeURIComponent(orderId), {headers: headers(), signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('We could not verify the payment.');
    const payment = await response.json();
    if (!a.payment_key || payment.paymentKey !== a.payment_key) throw new Error('The payment reference does not match.');
    return storeVerified(s, a, payment);
}
