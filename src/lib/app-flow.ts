import { standaloneAppCheckout } from './checkout-context';
export type ExecutionSurface = 'web' | 'app_preview' | 'android_webview';
export const APP_FLOW_FRAME = 'onepiece-app-flow';
export const UI_TARGETS = [
    'nav_home',
    'nav_shop',
    'nav_bag',
    'nav_account',
    'open_product',
    'select_category',
    'sort_menu',
    'sort_default',
    'sort_price_asc',
    'sort_price_desc',
    'select_size',
    'gallery_previous',
    'gallery_next',
    'gallery_thumbnail',
    'wishlist_toggle',
    'tab_details',
    'tab_care',
    'tab_shipping',
    'add_to_cart',
    'checkout_open',
    'login_submit',
    'join_open',
    'cart_increase',
    'cart_decrease',
    'cart_remove',
    'payment_start',
    'size_guide',
    'back',
    'outfit_open',
    'outfit_close',
    'grid_change',
    'view_cart_link',
    'outfit_jacket',
    'outfit_pants',
] as const;
export type UiTarget = (typeof UI_TARGETS)[number];
export function executionSurface(
    userAgent: string,
    frameName: string,
): ExecutionSurface {
    if (/(?:^|\s)OnePieceAndroid\/[\w.-]+(?:\s|$)/.test(userAgent))
        return 'android_webview';
    return frameName === APP_FLOW_FRAME ? 'app_preview' : 'web';
}
export function browserExecutionSurface(): ExecutionSurface {
    if (typeof window === 'undefined') return 'web';
    return executionSurface(
        navigator.userAgent,
        standaloneAppCheckout() ? APP_FLOW_FRAME : window.name,
    );
}
export function validUiTarget(value: unknown): value is UiTarget {
    return (
        typeof value === 'string' &&
        (UI_TARGETS as readonly string[]).includes(value)
    );
}
export function flowParameters(surface: ExecutionSurface) {
    return {
        execution_surface: surface,
        is_test: 1,
        ...(surface === 'app_preview'
            ? { flow_id: 'onepiece_app_flow_v1' }
            : {}),
    };
}
export function uiClickParameters(target: unknown, path: string) {
    if (!validUiTarget(target) || !path.startsWith('/') || path.length > 200)
        return null;
    return { ui_target: target, screen_path: path.split(/[?#]/)[0] };
}
