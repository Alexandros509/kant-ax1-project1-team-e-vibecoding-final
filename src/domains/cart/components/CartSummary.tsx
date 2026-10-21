'use client';
import Link from 'next/link';
import { formatPrice } from '@/shared/utils/formatPrice';
import type { CartItem } from '@/domains/cart/types/cart.types';

interface CartSummaryProps {
    items: CartItem[];
}

export default function CartSummary({ items }: CartSummaryProps) {
    // 합계는 items에서 계산할 수 있는 값이므로 별도의 상태로 중복 저장하지 않는다.
    const subtotal = items.reduce(
        (total, item) => total + item.unitPriceAtAdded * item.quantity,
        0,
    );

    return (
        <section
            aria-labelledby="cart-summary-title"
            className="border border-gray-200 bg-gray-50 p-6"
        >
            <h2 id="cart-summary-title" className="mb-6 text-lg font-semibold">
                ORDER SUMMARY
            </h2>

            <dl className="text-sm">
                <div className="flex items-start justify-between gap-4">
                    <dt className="text-gray-600">TOTAL</dt>
                    <dd className="text-right font-semibold">
                        {formatPrice(subtotal)}
                    </dd>
                </div>
            </dl>

            <p className="mt-4 text-sm text-gray-500">
                TAXES, DISCOUNTS & SHIPPING CALCULATED AT CHECKOUT.
            </p>

            <Link data-track-action="checkout_open" href="/checkout" className="mt-6 block w-full bg-black px-4 py-3 text-center text-sm font-medium text-white hover:bg-gray-800">CHECKOUT</Link>
        </section>
    );
}
