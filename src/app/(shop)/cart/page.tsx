'use client';

import Link from 'next/link';

import CartItemList from '@/domains/cart/components/CartItemList';
import CartSummary from '@/domains/cart/components/CartSummary';
import useCartActions from '@/domains/cart/components/useCartActions';
import useCounterStore from '@/shared/store/useCounterStore';

export default function CartPage() {
    const cartItems = useCounterStore((state) => state.cartItems);
    const { handleIncreaseQuantity, handleDecreaseQuantity, handleRemoveItem } =
        useCartActions();

    return (
        <main className="mx-auto max-w-none px-5 py-12">
            <h1 className="mb-8 text-2xl font-semibold">CART</h1>

            {/* 목록과 쇼핑 링크를 같은 열에 두고, 주문 요약을 옆에 배치한다. */}
            <div className="grid items-start gap-8 md:grid-cols-[2fr_1fr] md:gap-x-16 xl:gap-x-100">
                <div>
                    <CartItemList
                        items={cartItems}
                        onIncreaseQuantity={handleIncreaseQuantity}
                        onDecreaseQuantity={handleDecreaseQuantity}
                        onRemoveItem={handleRemoveItem}
                    />

                    <Link
                        href="/products"
                        className="mt-6 inline-flex border border-gray-300 px-5 py-3 text-sm"
                    >
                        CONTINUE SHOPPING
                    </Link>
                </div>

                {/* 상품이 있을 때만 주문 요약을 표시한다. */}
                {cartItems.length > 0 && <CartSummary items={cartItems} />}
            </div>
        </main>
    );
}
