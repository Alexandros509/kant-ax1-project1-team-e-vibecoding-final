import test from 'node:test';
import assert from 'node:assert/strict';
import { tossConfiguration } from './toss-config';
import {
    APP_CHECKOUT_KEY,
    validAppCheckoutContext,
    appPreviewScreen,
    appPreviewHref,
    moveCheckoutToTop,
} from './checkout-context';
test('Toss setup rejects live/widget keys and invalid origins without returning secrets', () => {
    const env = {
        TOSS_CLIENT_KEY: 'test_ck_example',
        TOSS_SECRET_KEY: 'test_sk_example',
        APP_ORIGIN: 'http://127.0.0.1:3019',
    };
    assert.equal(tossConfiguration(env).configured, true);
    assert.equal(tossConfiguration({...env, APP_ORIGIN: 'https://onepiece.test'}).configured, true);
    for (const change of [
        { TOSS_SECRET_KEY: 'live_sk_example' },
        {
            TOSS_CLIENT_KEY: 'test_gck_example',
            TOSS_SECRET_KEY: 'test_gsk_example',
        },
        { APP_ORIGIN: 'http://example.com' },
        { APP_ORIGIN: 'http://127.0.0.1:3019/' },
        { APP_ORIGIN: 'https://onepiece.test/' },
        { APP_ORIGIN: 'APP_ORIGIN=https://onepiece.test' },
        { TOSS_SECRET_KEY: '' },
    ])
        assert.equal(
            tossConfiguration({ ...env, ...change }).configured,
            false,
        );
    assert.equal(
        JSON.stringify(tossConfiguration(env)).includes('test_sk_example'),
        false,
    );
});
test('app checkout context survives callbacks but expires and cannot label unrelated pages', () => {
    const now = 10000,
        raw = JSON.stringify({ version: 1, expiresAt: now + 30000 });
    assert.equal(validAppCheckoutContext(raw, '/checkout', now), true);
    assert.equal(validAppCheckoutContext(raw, '/checkout/success', now), true);
    assert.equal(validAppCheckoutContext(raw, '/checkout/fail', now), true);
    assert.equal(validAppCheckoutContext(raw, '/products', now), false);
    assert.equal(validAppCheckoutContext(raw, '/checkout', now + 30000), false);
    assert.equal(validAppCheckoutContext('{', '/checkout', now), false);
    assert.equal(
        validAppCheckoutContext(
            JSON.stringify({ version: 1, expiresAt: now + 3600001 }),
            '/checkout',
            now,
        ),
        false,
    );
    assert.equal(appPreviewScreen('https://attacker.test'), '/');
    assert.equal(appPreviewScreen('//attacker.test'), '/');
    assert.equal(appPreviewScreen('/checkout'), '/');
    assert.equal(appPreviewHref('/cart'), '/app-preview?screen=%2Fcart');
});
test('checkout handoff navigates only to the same origin and stores no account or payment fields', () => {
    const previousWindow = Object.getOwnPropertyDescriptor(
            globalThis,
            'window',
        ),
        previousLocation = Object.getOwnPropertyDescriptor(
            globalThis,
            'location',
        );
    const stored = new Map<string, string>();
    let navigated = '';
    const top = {
        location: {
            origin: 'http://127.0.0.1:3019',
            assign: (url: string) => {
                navigated = url;
            },
        },
        sessionStorage: {
            setItem: (key: string, value: string) => stored.set(key, value),
        },
    };
    const frame = { top, self: {} };
    try {
        Object.defineProperty(globalThis, 'window', {
            configurable: true,
            value: frame,
        });
        Object.defineProperty(globalThis, 'location', {
            configurable: true,
            value: { origin: 'http://127.0.0.1:3019' },
        });
        assert.equal(moveCheckoutToTop(), true);
        assert.equal(navigated, 'http://127.0.0.1:3019/checkout');
        assert.deepEqual(
            Object.keys(JSON.parse(stored.get(APP_CHECKOUT_KEY)!)).sort(),
            ['expiresAt', 'version'],
        );
        top.location.origin = 'https://elsewhere.test';
        assert.throws(() => moveCheckoutToTop());
    } finally {
        if (previousWindow)
            Object.defineProperty(globalThis, 'window', previousWindow);
        else Reflect.deleteProperty(globalThis, 'window');
        if (previousLocation)
            Object.defineProperty(globalThis, 'location', previousLocation);
        else Reflect.deleteProperty(globalThis, 'location');
    }
});
