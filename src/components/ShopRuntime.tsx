'use client';
import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { CatalogProduct, ExperimentSession } from '@/lib/shop-model';
import { adaptProduct } from '@/lib/catalog-adapter';
import {
    browserExecutionSurface,
    flowParameters,
    validUiTarget,
    uiClickParameters,
} from '@/lib/app-flow';
import { reportFlowPreview } from '@/lib/flow-preview-events';
import { standaloneAppCheckout } from '@/lib/checkout-context';
import {isReportEvent,reportEventsForTarget,analyticsPageLocation,manualPageViews,analyticsDebug} from '@/lib/analytics-contract';
import useAppFlow from '@/shared/hooks/useAppFlow';
import type { Product } from '@/domains/products/types/product.types';
import useCounterStore from '@/shared/store/useCounterStore';
declare global {
    interface Window {
        dataLayer: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}
export async function shopPost(action: string, body: object = {}) {
    const r = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-shop-request': '1' },
        body: JSON.stringify({ action, ...body }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
}
let bootstrapRequest: Promise<ExperimentSession> | null = null;
function bootstrap() {
    bootstrapRequest ??= fetch('/api/shop?action=session', {
        cache: 'no-store',
    })
        .then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            return d;
        })
        .finally(() => {
            bootstrapRequest = null;
        });
    return bootstrapRequest;
}
type Context = {
    products: Product[];
    raw: CatalogProduct[];
    session: ExperimentSession | null;
    preview: 'A' | 'B' | null;
    arm: 'A' | 'B';
    loading: boolean;
    error: string;
    refresh: () => Promise<void>;
    track: (
        name: string,
        productId?: number,
        extra?: Record<string, unknown>,
    ) => Promise<void>;
};
const Runtime = createContext<Context | null>(null);
export const useShop = () => {
    const value = useContext(Runtime);
    if (!value) throw new Error('ShopRuntime required');
    return value;
};
export function basketPayload() {
    return useCounterStore
        .getState()
        .cartItems.map((i) => ({
            variantId: i.productVariantId,
            quantity: i.quantity,
        }));
}
export default function ShopRuntime({
    children,
}: {
    children: React.ReactNode;
}) {
    const [session, setSession] = useState<ExperimentSession | null>(null),
        [raw, setRaw] = useState<CatalogProduct[]>([]),
        [error, setError] = useState('');
    const surface = useAppFlow();
    useEffect(() => {
        if (surface !== 'web')
            document.documentElement.dataset.appSurface = surface;
        if (standaloneAppCheckout())
            document.documentElement.dataset.appCheckout = 'true';
        return () => {
            delete document.documentElement.dataset.appSurface;
            delete document.documentElement.dataset.appCheckout;
        };
    }, [surface]);
    const pathname = usePathname(),
        params = useSearchParams();
    const queryPreview = params.get('preview');
    const preview =
        queryPreview === 'A' || queryPreview === 'B' ? queryPreview : null;
    const sent = useRef<string | null>(null);
    const sessionRef = useRef(session);
    const previewRef = useRef(preview);
    useEffect(() => {
        sessionRef.current = session;
        previewRef.current = preview;
    }, [session, preview]);
    async function refresh() {
        setSession(await bootstrap());
    }
    useEffect(() => {
        let live = true;
        Promise.all([
            bootstrap().then(s => {
                if (live) setSession(s); // Login does not depend on a successful product request.
                return s;
            }),
            fetch('/api/shop?action=catalog').then(async (r) => {
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                const products = d.products as CatalogProduct[];
                if (live) setRaw(products);
                return products;
            }),
        ])
            .then(([s, p]) => {
                if (!live) return;
                try {
                    const browserSaved = JSON.parse(
                        localStorage.getItem('erd13-media-v3-onepiece-original-cart') || '[]',
                    );
                    const saved = s.registered ? (s.cart || []).map(i => ({productVariantId:i.variantId,quantity:i.quantity})) : browserSaved;
                    if(!s.registered && Array.isArray(saved) && !previewRef.current) {
                        void shopPost('cart',{items:saved.filter(i=>Number.isSafeInteger(i?.productVariantId)&&Number.isInteger(i?.quantity)&&i.quantity>0&&i.quantity<=10).slice(0,50).map(i=>({variantId:i.productVariantId,quantity:i.quantity}))}).catch(()=>{});
                    }
                    if (Array.isArray(saved))
                        useCounterStore.getState().setCartItems(() =>
                            saved
                                .filter(
                                    (i) =>
                                        Number.isInteger(i.productVariantId) &&
                                        Number.isInteger(i.quantity) &&
                                        i.quantity > 0 &&
                                        i.quantity <= 10,
                                )
                                .map((i) => {
                                    const product = p.find((p) =>
                                        p.variants.some(
                                            (v) => v.id === i.productVariantId,
                                        ),
                                    );
                                    const v = product?.variants.find(
                                        (v) => v.id === i.productVariantId,
                                    );
                                    return v && product
                                        ? {
                                              id: v.id,
                                              cartId: 0,
                                              productVariantId: v.id,
                                              quantity: i.quantity,
                                              unitPriceAtAdded: v.price,
                                              productNameAtAdded: product.name,
                                              optionTextAtAdded: `${v.color} / ${v.size}`,
                                              imageUrlAtAdded:
                                                  product.images[0],
                                          }
                                        : null;
                                })
                                .filter(
                                    (item): item is NonNullable<typeof item> =>
                                        item !== null,
                                ),
                        );
                } catch {
                    /* Ignore invalid browser-only cart. */
                }
            })
            .catch((e) => setError(e.message));
        return () => {
            live = false;
        };
    }, []);
    useEffect(() => {
        let chain = Promise.resolve();
        return useCounterStore.subscribe((state) => {
            try {
                localStorage.setItem(
                    'erd13-media-v3-onepiece-original-cart',
                    JSON.stringify(state.cartItems),
                );
            } catch {
                setError('We could not save your bag in this browser.');
            }
            const items = state.cartItems.map((i) => ({
                variantId: i.productVariantId,
                quantity: i.quantity,
            }));
            if (sessionRef.current && !previewRef.current)
                chain = chain
                    .then(async () => {
                        await shopPost('cart', { items });
                    })
                    .catch((e) =>
                        setError('Could not save your bag: ' + e.message),
                    );
        });
    }, []);
    useEffect(() => {
        if (!session?.consent || !/^G-[A-Z0-9]+$/.test(session.gaId) || preview)
            return;
        window.dataLayer = window.dataLayer || [];
        window.gtag =
            window.gtag ||
            function () {
                // eslint-disable-next-line prefer-rest-params -- Preserve the standard gtag Arguments queue.
                window.dataLayer.push(arguments);
            };
        window.gtag('consent', 'update', { analytics_storage: 'granted' });
        window.gtag('set', {...flowParameters(browserExecutionSurface()), ...(analyticsDebug()?{debug_mode:true}:{})});
        if (!document.getElementById('onepiece-ga')) {
            const script = document.createElement('script');
            script.id = 'onepiece-ga';
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${session.gaId}`;
            document.head.appendChild(script);
            window.gtag('js', new Date());
            window.gtag('config', session.gaId, {
                send_page_view: !manualPageViews(),
                // Initial provider return URLs can contain payment keys; only send their path.
                page_location: analyticsPageLocation(location.origin, location.pathname),
            });
        }
    }, [session, preview]);
    const track = useCallback(
        async (
            name: string,
            productId?: number,
            extra: Record<string, unknown> = {},
        ) => {
            if (!sessionRef.current?.consent || previewRef.current || (name !== 'ui_click' && !isReportEvent(name))) return;
            const s = sessionRef.current,
                p = raw.find((product) => product.id === productId) || raw.find(product => product.variants.some(v => String(v.id) === extra.option_id));
            const surface = browserExecutionSurface();
            const queued =
                /^G-[A-Z0-9]+$/.test(s.gaId) &&
                typeof window.gtag === 'function';
            const payload = {
                ...flowParameters(surface),
                ...(analyticsDebug() ? { debug_mode: true } : {}),
                page_location: analyticsPageLocation(location.origin,location.pathname),
                page_title: document.title,
                screen_path: location.pathname,
                currency: 'KRW',
                ...(p
                    ? {
                          items: [
                              {
                                  item_id: String(p.id),
                                  item_name: p.name,
                                  price: p.price,
                              },
                          ],
                      }
                    : {}),
                ...extra,
            };
            if (name === 'ui_click') {
                const click = uiClickParameters(
                    extra.ui_target,
                    location.pathname,
                );
                if (!click) return;
                // UI clicks do not wait on a network round trip, which would lose external-login navigation clicks.
                if (queued)
                    window.gtag?.('event', 'ui_click', {
                        ...payload,
                        ...click,
                        transport_type: 'beacon',
                    });
                if(queued)for(const eventName of reportEventsForTarget(click.ui_target))window.gtag?.('event',eventName,{...payload,...click,transport_type:'beacon'});
                reportFlowPreview(
                    'ui_click',
                    queued,
                    click.ui_target,
                    productId,
                );
                return;
            }
            try {
                const result = await shopPost('event', {
                    name,
                    key: crypto.randomUUID(),
                    productId,
                    path: location.pathname,
                });
                if (result.forward) {
                    if (queued) window.gtag?.('event', name, payload);
                    reportFlowPreview(name, queued, undefined, productId);
                }
            } catch {
                queueMicrotask(() =>
                    setError('We could not record this action.'),
                );
            }
        },
        [raw],
    );
    useEffect(() => {
        function click(event: MouseEvent) {
            const element =
                event.target instanceof Element
                    ? event.target.closest<HTMLElement>('[data-track-action]')
                    : null;
            const action = element?.dataset.trackAction;
            if (!element || !validUiTarget(action)) return;
            const item = Number(element.dataset.trackItemId),
                option = Number(element.dataset.trackOptionId);
            void track(
                'ui_click',
                Number.isSafeInteger(item) && item > 0 ? item : undefined,
                {
                    ui_target: action,
                    ui_state:
                        element.getAttribute('aria-disabled') === 'true'
                            ? 'unavailable'
                            : 'available',
                    ...(['3','4','6'].includes(element.dataset.trackValue||'')?{grid_columns:Number(element.dataset.trackValue)}:{}),
                    ...(Number.isSafeInteger(Number(element.dataset.trackQuantity)) && Number(element.dataset.trackQuantity)>0?{quantity:Number(element.dataset.trackQuantity)}:{}),
                    ...(Number.isSafeInteger(option) && option > 0
                        ? { option_id: String(option) }
                        : {}),
                },
            );
        }
        document.addEventListener('click', click, true);
        return () => document.removeEventListener('click', click, true);
    }, [track]);
    useEffect(() => {
        if (!session?.consent) {
            sent.current = null;
            return;
        }
        if (
            !raw.length ||
            preview ||
            (pathname.startsWith('/checkout') && window.top !== window.self)
        )
            return;
        if (sent.current === pathname) return;
        sent.current = pathname;
        if(manualPageViews())void track('page_view');
        const items=basketPayload().flatMap(item=>{const p=raw.find(p=>p.variants.some(v=>v.id===item.variantId));const v=p?.variants.find(v=>v.id===item.variantId);return p&&v?[{item_id:String(p.id),item_name:p.name,item_variant:v.color+' / '+v.size,price:v.price,quantity:item.quantity}]:[];});
        const basket={items,value:items.reduce((n,item)=>n+item.price*item.quantity,0)};
        if(pathname==='/cart')void track('view_cart',undefined,basket);
        else if(pathname==='/products')void track('view_item_list',undefined,{item_list_id:'products',items:raw.slice(0,200).map(p=>({item_id:String(p.id),item_name:p.name,price:p.price}))});
        else if(/^\/products\/\d+$/.test(pathname))void track('view_item',Number(pathname.split('/').pop()));
        else if(pathname==='/checkout'&&items.length)void track('begin_checkout',undefined,basket);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, session?.consent, raw.length, preview]);
    return (
        <Runtime.Provider
            value={{
                products: raw.map(adaptProduct),
                raw,
                session,
                preview,
                arm:
                    preview ||
                    (session?.experimentEnabled ? session.variant : 'B'),
                loading: !session || !raw.length,
                error,
                refresh,
                track,
            }}
        >
            {children}
            {error && (
                <div
                    role="alert"
                    className="fixed right-4 bottom-28 z-50 max-w-md border bg-white p-4 text-xs shadow"
                >
                    {error}
                    <button className="ml-4" onClick={() => setError('')}>
                        Close
                    </button>
                </div>
            )}
            {preview ? (
                <div className="fixed right-4 bottom-18 z-40 border bg-white px-3 py-2 text-[10px]">
                    {preview} preview · excluded from analytics{' '}
                    <Link
                        href="/products?preview=off"
                        className="ml-2 underline"
                    >
                        Exit
                    </Link>
                </div>
            ) : session && !session.consent ? (
                <div className="onepiece-consent-banner fixed inset-x-0 bottom-15 z-40 flex flex-wrap items-center justify-between gap-2 border-t bg-white/95 px-5 py-2 text-[10px]">
                    <span>
                        Demo store · No real charges. With your consent, we
                        record product views, bag activity and test orders.
                    </span>
                    <button
                        className="border border-black px-3 py-1"
                        onClick={async () => {
                            try {
                                await shopPost('consent', { consent: true });
                                await refresh();
                            } catch (e) {
                                setError((e as Error).message);
                            }
                        }}
                    >
                        Accept analytics
                    </button>
                </div>
            ) : null}
            {session?.consent && !preview && (
                <div className="px-6 py-2 text-[10px] text-neutral-500">
                    <button
                        onClick={async () => {
                            await shopPost('consent', { consent: false });
                            window.gtag?.('consent', 'update', {
                                analytics_storage: 'denied',
                            });
                            await refresh();
                        }}
                    >
                        Stop analytics
                    </button>
                </div>
            )}
        </Runtime.Provider>
    );
}
