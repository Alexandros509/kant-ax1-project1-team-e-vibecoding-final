# Toss Payments test setup

## Keys and URLs

Use your own Toss Payments developer test merchant and the API individual payment-window integration, not payment-widget keys. Set these project-root .env.local entries, then restart:

```dotenv
APP_ORIGIN=http://127.0.0.1:3019
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
```

The client key must start with test_ck_ and the matching server Secret with test_sk_. The code rejects live_ and widget gck/gsk keys. The browser receives the client key when preparing its payment; the Secret is server-only and must never use NEXT_PUBLIC_. Choose keys from the same merchant; matching prefixes alone do not prove a valid pair.

Success/failure URLs are built from APP_ORIGIN: /checkout/success and /checkout/fail. Use the exact browser origin, without a trailing slash. For remote hosts use HTTPS. npm run toss:check inspects format and origin only; it does not approve a payment or prove merchant matching.

## Why the button is disabled

The page lists unmet conditions. Log in with an existing OnePiece email/password account, put an available size in the bag, configure valid test keys, and acknowledge the test-payment notice. The UI review mode ?preview=A/B disables payment. There is no login bypass or fake success button.

Prices are loaded from the DB and checked again on the server. The redirect callback is confirmed against the provider before success is stored. Repeated confirmations must not create a second order or charge. After changing keys, validate with one authorized test payment and verify its test status/history in the provider console; format checks and mocked unit tests do not replace that test.

## Mobile simulation

Checkout leaves /app-preview's iframe before mounting the form or loading the payment SDK. It continues at top-level /checkout, retains the 430px app layout and provides return links to the preview. A same-origin sessionStorage marker expires after one hour; it stores no account, address or payment fields. A real installed Android shell requires separate end-to-end verification.

## ERD compatibility

The current ERD stores payment_key VARCHAR(200) on payments, alongside toss_order_id, confirm_idempotency_key, amounts, provider status and timestamps. payment_transactions stores approval/cancellation transaction keys and verified amounts. Cancellations are reconciled as observed history, not initiated by a cancellation API in this demo. The 13-table baseline replaces the previous 26-table model for fresh local DBs; it does not delete or migrate existing DB files.

Never use real delivery details or claim production payment readiness. Sources: [Toss payment window](https://docs.tosspayments.com/guides/v2/payment-window), [API reference](https://docs.tosspayments.com/reference).
