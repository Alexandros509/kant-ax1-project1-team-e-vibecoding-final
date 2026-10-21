import Link from 'next/link';
import CheckoutEntry from '@/components/CheckoutEntry';
export default function Page() {
    return (
        <CheckoutEntry>
            <main className="mx-auto min-h-[70vh] max-w-lg px-6 py-24 text-center">
                <h1 className="mb-6 text-2xl">Payment was not completed</h1>
                <p className="mb-10 text-sm text-neutral-500">
                    The payment window was closed or authentication failed.
                    Please review your bag and try again.
                </p>
                <Link className="block border p-4" href="/checkout">
                    Return to checkout
                </Link>
            </main>
        </CheckoutEntry>
    );
}
