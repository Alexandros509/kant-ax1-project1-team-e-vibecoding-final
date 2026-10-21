export const APP_CHECKOUT_KEY = 'erd13-media-v3-onepiece-app-checkout-v1';
const LIFETIME = 60 * 60 * 1000;
export function validAppCheckoutContext(
    raw: string | null,
    pathname: string,
    now = Date.now(),
) {
    if (
        !['/checkout', '/checkout/success', '/checkout/fail'].includes(
            pathname,
        ) ||
        !raw
    )
        return false;
    try {
        const value = JSON.parse(raw);
        return (
            value?.version === 1 &&
            Number.isSafeInteger(value.expiresAt) &&
            value.expiresAt > now &&
            value.expiresAt <= now + LIFETIME
        );
    } catch {
        return false;
    }
}
export function standaloneAppCheckout() {
    if (typeof window === 'undefined' || window.top !== window.self)
        return false;
    try {
        return validAppCheckoutContext(
            sessionStorage.getItem(APP_CHECKOUT_KEY),
            location.pathname,
        );
    } catch {
        return false;
    }
}
export function moveCheckoutToTop() {
    if (window.top === window.self) return false;
    const top = window.top;
    if (!top || top.location.origin !== location.origin)
        throw new Error('Please open checkout directly to continue.');
    // Only an origin-local UI marker is stored; no identity, delivery data or payment keys.
    top.sessionStorage.setItem(
        APP_CHECKOUT_KEY,
        JSON.stringify({ version: 1, expiresAt: Date.now() + LIFETIME }),
    );
    top.location.assign(new URL('/checkout', location.origin).href);
    return true;
}
export function appPreviewScreen(value: unknown): string {
    return typeof value === 'string' &&
        /^(?:\/|\/products(?:\/[1-9][0-9]*)?|\/cart|\/login|\/join)$/.test(
            value,
        )
        ? value
        : '/';
}
export function appPreviewHref(screen: string) {
    return (
        '/app-preview?screen=' + encodeURIComponent(appPreviewScreen(screen))
    );
}
