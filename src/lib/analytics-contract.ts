export const REPORT_EVENTS = [
    'page_view','navigation_click','select_item','view_item','view_item_list',
    'add_to_cart','select_variant','view_cart','grid_change','begin_checkout',
    'cart_drawer_close','cart_drawer_open','sort_change','view_cart_click',
    'checkout_click','product_info_toggle','payment_button_click',
    'remove_from_cart','add_to_cart_attempt','cart_quantity_change','feature_unavailable',
] as const;
export const isReportEvent = (name: string) => (REPORT_EVENTS as readonly string[]).includes(name);
export function reportEventsForTarget(target: string): string[] {
    if (target === 'nav_bag') return ['navigation_click','view_cart_click'];
    if (['nav_home','nav_shop','nav_account','back','select_category'].includes(target)) return ['navigation_click'];
    if (target === 'view_cart_link') return ['view_cart_click'];
    if (target === 'select_size') return ['select_variant'];
    if (['sort_default','sort_price_asc','sort_price_desc'].includes(target)) return ['sort_change'];
    if (target === 'grid_change') return ['grid_change'];
    if (['tab_details','tab_care','tab_shipping','size_guide'].includes(target)) return ['product_info_toggle'];
    if (target === 'add_to_cart') return ['add_to_cart_attempt'];
    if (target === 'checkout_open') return ['checkout_click'];
    if (target === 'payment_start') return ['payment_button_click'];
    if (['cart_increase','cart_decrease'].includes(target)) return ['cart_quantity_change'];
    if (target === 'cart_remove') return ['remove_from_cart'];
    return [];
}
export function analyticsPageLocation(origin: string, pathname: string) {
    const url=new URL(origin);
    if (!['http:','https:'].includes(url.protocol) || !pathname.startsWith('/') || pathname.startsWith('//')) throw new Error('Invalid analytics location.');
    // Payment/OAuth codes, email and arbitrary query/hash values must never become page_location.
    return url.origin + pathname.split(/[?#]/)[0];
}
export const manualPageViews = () => process.env.NEXT_PUBLIC_GA_PAGEVIEW_MODE === 'manual';
export const analyticsDebug = () => process.env.NEXT_PUBLIC_GA_DEBUG_MODE === 'true';
