import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { tossTestKeys } from './toss-config';
import { checkout, type Session } from './shop-server';
type Attempt = {
    id: string;
    order_id: string;
    provider_payment_id: string | null;
    idempotency_key: string;
    amount: string;
    status: string;
    order_status: string;
    order_number: string;
    total_amount: string;
};
type Payment = {
    status: string;
    orderId: string;
    paymentKey: string;
    totalAmount: number;
    currency: string;
    approvedAt?: string;
    cancels?: {
        transactionKey: string;
        cancelAmount: number;
        cancelStatus: string;
        canceledAt: string;
        cancelReason?: string;
    }[];
};
const states = new Set([
    'READY',
    'IN_PROGRESS',
    'WAITING_FOR_DEPOSIT',
    'DONE',
    'CANCELED',
    'PARTIAL_CANCELED',
    'ABORTED',
    'EXPIRED',
]);
const headers = () => ({
    Authorization:
        'Basic ' +
        Buffer.from(tossTestKeys().secretKey + ':').toString('base64'),
    'Content-Type': 'application/json',
});
const inFlight = new Map<
    string,
    Promise<{ orderNumber: string; total: number; status?: string }>
>();
export async function createPaymentAttempt(
    s: Session,
    body: Record<string, unknown>,
) {
    const order = await checkout(s, body),
        db = await getDb();
    const attempt = await db.transaction(async (tx) => {
        const current = (
            await tx.query<{ id: string; status: string }>(
                'SELECT id,status FROM orders WHERE order_number=$1 AND customer_id=$2 FOR UPDATE',
                [order.orderNumber, s.user_id],
            )
        ).rows[0];
        if (current.status !== 'pending')
            throw new Error('This order cannot start another payment.');
        const open = (
            await tx.query<{ id: string }>(
                "SELECT id FROM payments WHERE order_id=$1 AND status IN ('READY','IN_PROGRESS','WAITING_FOR_DEPOSIT')",
                [current.id],
            )
        ).rows[0];
        if (open) return open;
        return (
            await tx.query<{ id: string }>(
                "INSERT INTO payments(id,order_id,provider,provider_payment_id,idempotency_key,amount,status,paid_at,currency) VALUES($1,$2,'toss',NULL,$3,$4,'READY',NULL,'KRW') RETURNING id",
                [randomUUID(), current.id, randomUUID(), order.total],
            )
        ).rows[0];
    });
    return { ...order, paymentOrderId: 'TEST-' + attempt.id };
}
async function owned(s: Session, orderId: string) {
    if (!s.user_id || !/^TEST-[a-f0-9-]{36}$/.test(orderId))
        throw new Error('Invalid payment reference.');
    const a = (
        await (
            await getDb()
        ).query<Attempt>(
            "SELECT p.*,o.order_number,o.status AS order_status,o.total_amount FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.id=$1 AND o.customer_id=$2 AND p.provider='toss' AND p.currency='KRW'",
            [orderId.slice(5), s.user_id],
        )
    ).rows[0];
    if (!a) throw new Error('The payment account or reference does not match.');
    return a;
}
function time(value: string) {
    if (!Number.isFinite(Date.parse(value)))
        throw new Error('Invalid payment time.');
    return value;
}
async function storeVerified(s: Session, a: Attempt, p: Payment) {
    if (
        !states.has(p.status) ||
        p.orderId !== 'TEST-' + a.id ||
        p.paymentKey !== a.provider_payment_id ||
        !Number.isSafeInteger(p.totalAmount) ||
        p.totalAmount !== Number(a.amount) ||
        p.totalAmount !== Number(a.total_amount) ||
        p.currency !== 'KRW'
    )
        throw new Error('The payment confirmation does not match this order.');
    const db = await getDb();
    await db.transaction(async (tx) => {
        const latest = (
            await tx.query<{ status: string }>(
                'SELECT status FROM payments WHERE id=$1 FOR UPDATE',
                [a.id],
            )
        ).rows[0];
        if (
            (latest.status === 'CANCELED' && p.status !== 'CANCELED') ||
            (latest.status === 'PARTIAL_CANCELED' &&
                !['CANCELED', 'PARTIAL_CANCELED'].includes(p.status)) ||
            (latest.status === 'DONE' &&
                [
                    'READY',
                    'IN_PROGRESS',
                    'WAITING_FOR_DEPOSIT',
                    'ABORTED',
                    'EXPIRED',
                ].includes(p.status))
        )
            throw new Error(
                'A newer payment status has already been recorded.',
            );
        for (const c of p.cancels || [])
            if (c.cancelStatus === 'DONE') {
                if (
                    !['CANCELED', 'PARTIAL_CANCELED'].includes(p.status) ||
                    !c.transactionKey ||
                    c.transactionKey.length > 100 ||
                    !Number.isSafeInteger(c.cancelAmount) ||
                    c.cancelAmount < 0 ||
                    c.cancelAmount > p.totalAmount
                )
                    throw new Error('Invalid refund.');
                const old = (
                    await tx.query<{ payment_id: string; amount: string }>(
                        'SELECT payment_id,amount FROM refunds WHERE provider_refund_id=$1',
                        [c.transactionKey],
                    )
                ).rows[0];
                if (old) {
                    if (
                        old.payment_id !== a.id ||
                        Number(old.amount) !== c.cancelAmount
                    )
                        throw new Error('A refund reference was reused.');
                    continue;
                }
                await tx.query(
                    "INSERT INTO refunds(id,payment_id,provider_refund_id,idempotency_key,amount,status,refunded_at,currency,reason) VALUES($1,$2,$3,$4,$5,'DONE',$6,'KRW',$7)",
                    [
                        randomUUID(),
                        a.id,
                        c.transactionKey,
                        'reconcile:' + c.transactionKey,
                        c.cancelAmount,
                        time(c.canceledAt),
                        c.cancelReason || null,
                    ],
                );
            }
        await tx.query(
            'UPDATE payments SET status=$1,paid_at=coalesce($2,paid_at) WHERE id=$3',
            [p.status, p.approvedAt ? time(p.approvedAt) : null, a.id],
        );
        if (p.status === 'DONE') {
            await tx.query(
                "UPDATE orders SET status='paid' WHERE id=$1 AND status='pending'",
                [a.order_id],
            );
            await tx.query(
                "UPDATE carts SET status='converted' WHERE customer_id=$1 AND status='active'",
                [s.user_id],
            );
        }
        if (p.status === 'CANCELED')
            await tx.query("UPDATE orders SET status='canceled' WHERE id=$1", [
                a.order_id,
            ]);
    });
    return {
        orderNumber: a.order_number,
        total: Number(a.amount),
        status: p.status,
    };
}
export async function approvePayment(
    s: Session,
    body: Record<string, unknown>,
) {
    const orderId = String(body.orderId || ''),
        paymentKey = String(body.paymentKey || ''),
        amount = Number(body.amount);
    if (!paymentKey || paymentKey.length > 200 || !Number.isSafeInteger(amount))
        throw new Error('Invalid payment request.');
    const a = await owned(s, orderId);
    if (Number(a.amount) !== amount || Number(a.total_amount) !== amount)
        throw new Error('The order amount does not match.');
    if (a.provider_payment_id && a.provider_payment_id !== paymentKey)
        throw new Error('The payment reference does not match.');
    if (a.status === 'DONE' && a.order_status === 'paid')
        return { orderNumber: a.order_number, total: amount };
    if (
        a.order_status !== 'pending' ||
        !['READY', 'IN_PROGRESS'].includes(a.status)
    )
        throw new Error('This payment cannot be approved.');
    const key = JSON.stringify([s.user_id, orderId, paymentKey, amount]);
    if (inFlight.has(key)) return inFlight.get(key)!;
    const task = (async () => {
        const bound = await (
            await getDb()
        ).query(
            'UPDATE payments SET provider_payment_id=$1 WHERE id=$2 AND (provider_payment_id IS NULL OR provider_payment_id=$1) RETURNING id',
            [paymentKey, a.id],
        );
        if (!bound.rows.length)
            throw new Error('The payment reference does not match.');
        a.provider_payment_id = paymentKey;
        let result = await fetch(
            'https://api.tosspayments.com/v1/payments/confirm',
            {
                method: 'POST',
                headers: { ...headers(), 'Idempotency-Key': a.idempotency_key },
                body: JSON.stringify({ orderId, paymentKey, amount }),
                signal: AbortSignal.timeout(20000),
            },
        );
        let payment = await result.json();
        if (!result.ok && payment.code === 'ALREADY_PROCESSED_PAYMENT') {
            result = await fetch(
                'https://api.tosspayments.com/v1/payments/orders/' +
                    encodeURIComponent(orderId),
                { headers: headers(), signal: AbortSignal.timeout(15000) },
            );
            payment = await result.json();
        }
        if (!result.ok || payment.status !== 'DONE')
            throw new Error(
                'We could not confirm your payment. Please try again.',
            );
        return storeVerified(s, a, payment);
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, task);
    return task;
}
export async function reconcilePayment(
    s: Session,
    body: Record<string, unknown>,
) {
    const orderId = String(body.orderId || ''),
        a = await owned(s, orderId);
    const response = await fetch(
        'https://api.tosspayments.com/v1/payments/orders/' +
            encodeURIComponent(orderId),
        { headers: headers(), signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) throw new Error('We could not verify the payment.');
    const p = await response.json();
    if (!a.provider_payment_id || p.paymentKey !== a.provider_payment_id)
        throw new Error('The payment reference does not match.');
    return storeVerified(s, a, p);
}
