'use client';
import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { standaloneAppCheckout, appPreviewHref } from '@/lib/checkout-context';
const subscribe = () => () => {};
import { usePathname, useRouter } from 'next/navigation';
import {
    House,
    Grid2X2,
    ShoppingBag,
    UserRound,
    ArrowLeft,
} from 'lucide-react';
export default function AppNavigation({ quantity }: { quantity: number }) {
    const path = usePathname(),
        router = useRouter();
    const externalCheckout = useSyncExternalStore(
        subscribe,
        standaloneAppCheckout,
        () => false,
    );
    const tabs = [
        {
            href: '/',
            label: 'Home',
            icon: House,
            target: 'nav_home',
            active: path === '/',
        },
        {
            href: '/products',
            label: 'Shop',
            icon: Grid2X2,
            target: 'nav_shop',
            active: path.startsWith('/products'),
        },
        {
            href: '/cart',
            label: 'Bag',
            icon: ShoppingBag,
            target: 'nav_bag',
            active: path === '/cart' || path.startsWith('/checkout'),
        },
        {
            href: '/login',
            label: 'My',
            icon: UserRound,
            target: 'nav_account',
            active: path === '/login' || path === '/join',
        },
    ];
    return (
        <>
            <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-neutral-100 bg-white px-3 text-black">
                <button
                    type="button"
                    data-track-action="back"
                    disabled={path === '/'}
                    aria-label="Go back"
                    className="grid h-11 w-11 place-items-center disabled:invisible"
                    onClick={() => {
                        if (externalCheckout) {
                            router.replace(appPreviewHref('/cart'));
                            return;
                        }
                        if (window.history.length > 1) router.back();
                        else router.replace('/products');
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <span className="font-serif text-xl">OnePiece</span>
                <span className="w-11" />
            </header>
            <nav
                aria-label="App navigation"
                className="onepiece-app-nav fixed inset-x-0 bottom-0 z-50 grid h-15 grid-cols-4 border-t border-neutral-200 bg-white text-black"
            >
                {tabs.map(({ href, label, icon: Icon, target, active }) => (
                    <Link
                        key={href}
                        href={externalCheckout ? appPreviewHref(href) : href}
                        data-track-action={target}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${active ? 'font-semibold text-black' : 'text-neutral-500'}`}
                    >
                        <span className="relative">
                            <Icon size={21} strokeWidth={active ? 2 : 1.5} />
                            {label === 'Bag' && quantity > 0 && (
                                <span
                                    className="absolute -top-2 -right-3 min-w-4 rounded-full bg-black px-1 text-center text-[9px] leading-4 text-white"
                                    aria-label={`${quantity} items`}
                                >
                                    {quantity}
                                </span>
                            )}
                        </span>
                        {label}
                    </Link>
                ))}
            </nav>
        </>
    );
}
