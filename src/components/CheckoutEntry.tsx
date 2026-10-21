'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { moveCheckoutToTop } from '@/lib/checkout-context';
import styles from './CheckoutPage.module.scss';
const subscribe = () => () => {};
// Until topology is known, no payment SDK, approval or checkout form is mounted.
export default function CheckoutEntry({
    children,
}: {
    children: React.ReactNode;
}) {
    const framed = useSyncExternalStore(
        subscribe,
        () => window.top !== window.self,
        () => true,
    );
    const [error, setError] = useState('');
    useEffect(() => {
        if (!framed) return;
        try {
            moveCheckoutToTop();
        } catch {
            queueMicrotask(() =>
                setError('Please open checkout directly to continue.'),
            );
        }
    }, [framed]);
    if (!framed) return children;
    return (
        <main className={styles.success}>
            <div className={styles.brand}>OnePiece</div>
            <p role={error ? 'alert' : 'status'}>
                {error || 'Opening checkout…'}
            </p>
            <a href="/checkout" target="_top">
                Continue to checkout
            </a>
        </main>
    );
}
