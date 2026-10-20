'use client';

import Link from 'next/link';

import CartItemList from '@/domains/cart/components/CartItemList';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/shared/components/ui/dialog';
import useCartActions from '@/domains/cart/components/useCartActions';
import useCounterStore from '@/shared/store/useCounterStore';
import { formatPrice } from '@/shared/utils/formatPrice';

interface CartDrawerProps {
    totalQuantity: number;
}

export default function CartDrawer({ totalQuantity }: CartDrawerProps) {
    const cartItems = useCounterStore((state) => state.cartItems);
    const { handleIncreaseQuantity, handleDecreaseQuantity, handleRemoveItem } =
        useCartActions();
    const subtotal = cartItems.reduce(
        (total, item) => total + item.unitPriceAtAdded * item.quantity,
        0,
    );

    return (
        <Dialog>
            <DialogTrigger
                type="button"
                className="flex cursor-pointer items-center gap-1 sm:gap-3"
            >
                <span>CART</span>
                <span>{totalQuantity}</span>
            </DialogTrigger>

            <DialogContent
                showCloseButton={false}
                className="data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100 top-0 right-0 bottom-0 left-auto flex h-dvh w-full max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none bg-white p-5 duration-200 sm:max-w-[700px]"
            >
                <div className="flex shrink-0 items-center justify-between">
                    <DialogTitle>CART</DialogTitle>

                    <DialogClose
                        type="button"
                        aria-label="CLOSE CART"
                        className="cursor-pointer text-sm"
                    >
                        X
                    </DialogClose>
                </div>

                <DialogDescription className="sr-only">
                    REVIEW YOUR CART ITEMS.
                </DialogDescription>

                <div className="min-h-0 flex-1 overflow-y-auto [&>ul]:border-b-0">
                    <CartItemList
                        items={cartItems}
                        onIncreaseQuantity={handleIncreaseQuantity}
                        onDecreaseQuantity={handleDecreaseQuantity}
                        onRemoveItem={handleRemoveItem}
                    />
                </div>

                <section
                    aria-label="ORDER SUMMARY"
                    className="mt-auto shrink-0 pt-5"
                >
                    <h2 className="mb-4 text-base font-semibold">
                        ORDER SUMMARY
                    </h2>

                    <dl className="text-sm">
                        <div className="flex items-center justify-between gap-4">
                            <dt>TOTAL</dt>
                            <dd className="font-semibold">
                                {formatPrice(subtotal)}
                            </dd>
                        </div>
                    </dl>

                    <p className="mt-3 text-xs text-gray-500">
                        TAXES, DISCOUNTS & SHIPPING CALCULATED AT CHECKOUT.
                    </p>

                    <div className="mt-5 flex flex-col gap-3">
                        <DialogClose
                            nativeButton={false}
                            render={<Link href="/cart" />}
                            className="flex w-full items-center justify-center border border-gray-300 bg-gray-100 px-4 py-3 text-sm font-medium text-black hover:bg-gray-200"
                        >
                            VIEW CART
                        </DialogClose>

                        <DialogClose nativeButton={false} render={<Link href="/checkout" />} className="flex w-full items-center justify-center border border-black bg-black px-4 py-3 text-sm font-medium text-white">CHECKOUT</DialogClose>
                    </div>
                </section>
            </DialogContent>
        </Dialog>
    );
}
