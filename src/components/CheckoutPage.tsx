'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { browserExecutionSurface, flowParameters } from '@/lib/app-flow';
import { reportFlowPreview } from '@/lib/flow-preview-events';
import { appPreviewHref } from '@/lib/checkout-context';
import { analyticsPageLocation } from '@/lib/analytics-contract';
import useAppFlow from '@/shared/hooks/useAppFlow';
import { useShop, shopPost, basketPayload } from './ShopRuntime';
import useCounterStore from '@/shared/store/useCounterStore';
import { formatPrice } from '@/shared/utils/formatPrice';
import styles from './CheckoutPage.module.scss';
type Receipt = { order_number: string; total_amount: number; status: string };
type TossWindow = Window & {
    TossPayments?: (key: string) => {
        payment: (input: { customerKey: string }) => {
            requestPayment: (input: object) => Promise<void>;
        };
    };
};
let sdk: Promise<void> | undefined;
function loadToss() {
    if ((window as TossWindow).TossPayments) return Promise.resolve();
    return (sdk ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.tosspayments.com/v2/standard';
        script.onload = () => resolve();
        script.onerror = () => {
            script.remove();
            sdk = undefined;
            reject(
                new Error(
                    'We could not load the payment window. Please try again.',
                ),
            );
        };
        document.head.appendChild(script);
    }));
}
export default function CheckoutPage({
    success = false,
}: {
    success?: boolean;
}) {
    const surface = useAppFlow();
    const returnHref = (screen: string) =>
        surface === 'app_preview' ? appPreviewHref(screen) : screen;
    const { session, preview } = useShop();
    const items = useCounterStore((s) => s.cartItems);
    const [error, setError] = useState(''),
        [busy, setBusy] = useState(false),
        [receipt, setReceipt] = useState<Receipt | null>(null),
        [retry, setRetry] = useState(0);
    const [delivery, setDelivery] = useState({
            name: 'Test recipient',
            phone: '000-0000-0000',
            zipcode: '00000',
            address: 'Demo address (no shipping)',
            address2: '',
            memo: '',
        }),
        [agreed, setAgreed] = useState(false);
    const paymentRequirements = !session
        ? ['Loading checkout…']
        : [
              ...(!session.member ? ['Sign in with Kakao to continue.'] : []),
              ...(!session.tossConfigured
                  ? ['Test payments are currently unavailable.']
                  : []),
              ...(!items.length ? ['Add an item to your bag.'] : []),
              ...(preview ? ['Payments are disabled in preview mode.'] : []),
              ...(!agreed ? ['Confirm the test payment notice above.'] : []),
          ];
    const total = items.reduce(
        (n, i) => n + i.unitPriceAtAdded * i.quantity,
        0,
    );
    const confirming = useRef(false);
    useEffect(() => {
        if (!success || !session || confirming.current) return;
        confirming.current = true;
        let active = true;
        setError('');
        (async () => {
            const q = new URLSearchParams(location.search);
            let number = q.get('order');
            if (q.has('paymentKey')) {
                const result = await shopPost('toss-confirm', {
                    paymentKey: q.get('paymentKey'),
                    orderId: q.get('orderId'),
                    amount: q.get('amount'),
                });
                number = result.orderNumber;
                useCounterStore.getState().setCartItems(() => []);
                localStorage.removeItem('erd13-media-v3-onepiece-pending-order');
                if (
                    session.consent &&
                    !localStorage.getItem('erd13-media-v3-ga-purchase-' + number)
                ) {
                    window.gtag?.('event', 'purchase', {
                        transaction_id: number,
                        page_location: analyticsPageLocation(location.origin, location.pathname),
                        value: result.total,
                        currency: 'KRW',
                        ...flowParameters(browserExecutionSurface()),
                        ...(session.experimentEnabled
                            ? {
                                  experiment_id: session.experimentId,
                                  experiment_variant: session.variant,
                              }
                            : {}),
                    });
                    reportFlowPreview(
                        'purchase',
                        /^G-[A-Z0-9]+$/.test(session.gaId) && !!window.gtag,
                    );
                    localStorage.setItem('erd13-media-v3-ga-purchase-' + number, '1');
                }
                history.replaceState(
                    null,
                    '',
                    '/checkout/success?order=' + encodeURIComponent(number!),
                );
            }
            if (!number) throw new Error('No order number was provided.');
            const r = await fetch(
                '/api/shop?action=receipt&number=' + encodeURIComponent(number),
            );
            const d = await r.json();
            if (!r.ok || !d.order || d.order.status !== 'paid')
                throw new Error('We could not find a completed order.');
            if (active) setReceipt(d.order);
        })()
            .catch((e) => {
                if (active) setError((e as Error).message);
            })
            .finally(() => {
                confirming.current = false;
            });
        return () => {
            active = false;
            confirming.current = false;
        };
    }, [session, success, retry]);
    async function pay(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            if (window.top !== window.self)
                throw new Error('Please open checkout directly to continue.');
            if (!agreed)
                throw new Error('Please confirm the test payment notice.');
            const basket = basketPayload();
            const fingerprint = JSON.stringify({ basket, delivery });
            let pending: null | { fingerprint: string; key: string } = null;
            try {
                pending = JSON.parse(
                    localStorage.getItem('erd13-media-v3-onepiece-pending-order') || 'null',
                );
            } catch {}
            const key =
                pending?.fingerprint === fingerprint
                    ? pending.key
                    : crypto.randomUUID();
            localStorage.setItem(
                'erd13-media-v3-onepiece-pending-order',
                JSON.stringify({ fingerprint, key }),
            );
            await shopPost('cart', { items: basket });
            const order = await shopPost('toss-prepare', {
                items: basket,
                key,
                delivery,
            });
            await loadToss();
            await (window as TossWindow).TossPayments!(order.clientKey)
                .payment({ customerKey: order.customerKey })
                .requestPayment({
                    method: 'CARD',
                    amount: { currency: 'KRW', value: order.total },
                    orderId: order.paymentOrderId,
                    orderName: order.orderName,
                    successUrl: order.successUrl,
                    failUrl: order.failUrl,
                });
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setBusy(false);
        }
    }
    if (success)
        return (
            <main className={styles.success}>
                <div className={styles.brand}>OnePiece</div>
                <h1>{receipt ? 'Order complete' : 'Payment confirmation'}</h1>
                {receipt ? (
                    <>
                        <p>{receipt.order_number}</p>
                        <strong>{formatPrice(receipt.total_amount)}</strong>
                        <p>
                            Your test payment was approved. No real charge or
                            shipping will take place.
                        </p>
                    </>
                ) : error ? (
                    <>
                        <p role="alert">{error}</p>
                        <button onClick={() => setRetry((n) => n + 1)}>
                            Check payment status again
                        </button>
                    </>
                ) : (
                    <p role="status">Confirming your payment…</p>
                )}
                <Link href={returnHref('/products')}>Continue shopping →</Link>
            </main>
        );
    function field(
        key: keyof typeof delivery,
        label: string,
        required = false,
        maxLength = 255,
    ) {
        return (
            <label>
                {label}
                <input
                    required={required}
                    maxLength={maxLength}
                    value={delivery[key]}
                    onChange={(e) =>
                        setDelivery((d) => ({ ...d, [key]: e.target.value }))
                    }
                />
            </label>
        );
    }
    return (
        <main className={styles.page}>
            <div className={styles.brand}>OnePiece</div>
            <div className={styles.breadcrumb}>
                <Link href={returnHref('/cart')}>Bag</Link>
                <span> / </span>
                <strong>Checkout</strong>
                <span> / Order complete</span>
            </div>
            <form onSubmit={pay} className={styles.grid}>
                <div className={styles.fields}>
                    <section>
                        <div className={styles.sectionTitle}>
                            <h1>Contact</h1>
                            <Link href={returnHref('/login')}>
                                {session?.member ? 'Profile' : 'Log in'}
                            </Link>
                        </div>
                        {session?.member ? (
                            <p>{session.member.name} · ONEPIECE member</p>
                        ) : (
                            <div className={styles.notice}>
                                Please log in to complete your order.
                                <div className={styles.loginLinks}>
                                    <Link href={returnHref('/login')}>
                                        Log in →
                                    </Link>
                                    <Link href={returnHref('/join')}>Join</Link>
                                </div>
                            </div>
                        )}
                    </section>
                    <section>
                        <h2>Delivery address</h2>
                        <p className={styles.hint}>
                            Use demo details for this test order. No items will
                            be shipped.
                        </p>
                        <div className={styles.row}>
                            {field('name', 'Recipient', true, 50)}
                            {field('phone', 'Contact', true, 20)}
                        </div>
                        {field('zipcode', 'Postal code', true, 10)}
                        {field('address', 'Address', true)}
                        {field('address2', 'Address line 2')}
                        {field('memo', 'Delivery instructions')}
                    </section>
                    <section>
                        <h2>Delivery method</h2>
                        <div className={styles.option}>
                            Demo delivery <span>Free</span>
                        </div>
                    </section>
                    <section>
                        <h2>Payment</h2>
                        <p className={styles.hint}>
                            Payments are processed in Toss Payments test mode.
                        </p>
                        <div className={styles.option}>
                            <span>Card / Digital wallet</span>
                            <span>Toss Payments</span>
                        </div>
                        <p className={styles.paymentInfo}>
                            Choose your payment method in the Toss Payments
                            window. OnePiece does not collect or store card
                            details.
                        </p>
                        {!session?.tossConfigured && (
                            <p className={styles.notice}>
                                Test payments are currently unavailable. Please
                                try again later.
                            </p>
                        )}
                    </section>
                    <label className={styles.check}>
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                        />{' '}
                        I understand this is a test payment with no real charge
                        or shipping.
                    </label>
                    <button
                        data-track-action="payment_start"
                        className={styles.pay}
                        disabled={busy || paymentRequirements.length > 0}
                        aria-describedby={
                            paymentRequirements.length
                                ? 'payment-requirements'
                                : undefined
                        }
                    >
                        {busy
                            ? 'Preparing payment…'
                            : `${formatPrice(total)} Pay in test mode`}
                    </button>
                    {paymentRequirements.length > 0 && (
                        <div
                            id="payment-requirements"
                            className={styles.paymentRequirements}
                            aria-live="polite"
                        >
                            <p>To continue:</p>
                            <ul>
                                {paymentRequirements.map((requirement) => (
                                    <li key={requirement}>{requirement}</li>
                                ))}
                            </ul>
                            {session && !session.member && (
                                <Link href={returnHref('/login')}>
                                    Log in with Kakao →
                                </Link>
                            )}
                        </div>
                    )}
                    {error && (
                        <p role="alert" className={styles.error}>
                            {error}
                        </p>
                    )}
                </div>
                <aside className={styles.summary}>
                    <h2>Order summary</h2>
                    {items.length ? (
                        items.map((i) => (
                            <div className={styles.item} key={i.id}>
                                <div className={styles.thumb}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={i.imageUrlAtAdded || undefined}
                                        alt={i.productNameAtAdded}
                                    />
                                    <span>{i.quantity}</span>
                                </div>
                                <div>
                                    <p>{i.productNameAtAdded}</p>
                                    <small>{i.optionTextAtAdded}</small>
                                </div>
                                <strong>
                                    {formatPrice(
                                        i.unitPriceAtAdded * i.quantity,
                                    )}
                                </strong>
                            </div>
                        ))
                    ) : (
                        <p className={styles.notice}>
                            Your bag is empty.{' '}
                            <Link href={returnHref('/products')}>
                                Explore products →
                            </Link>
                        </p>
                    )}
                    <div className={styles.totals}>
                        <p>
                            <span>Subtotal</span>
                            <span>{formatPrice(total)}</span>
                        </p>
                        <p>
                            <span>Delivery</span>
                            <span>Free</span>
                        </p>
                        <p className={styles.total}>
                            <strong>Total</strong>
                            <strong>{formatPrice(total)}</strong>
                        </p>
                    </div>
                    <Link href={returnHref('/cart')} className={styles.back}>
                        Edit bag
                    </Link>
                </aside>
            </form>
        </main>
    );
}
