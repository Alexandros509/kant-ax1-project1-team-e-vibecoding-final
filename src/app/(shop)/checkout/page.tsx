import { Suspense } from 'react';
import CheckoutPage from '@/components/CheckoutPage';
import CheckoutEntry from '@/components/CheckoutEntry';
export default function Page() {
    return (
        <Suspense>
            <CheckoutEntry>
                <CheckoutPage />
            </CheckoutEntry>
        </Suspense>
    );
}
