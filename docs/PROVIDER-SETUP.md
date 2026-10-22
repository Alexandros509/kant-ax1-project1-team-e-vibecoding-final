# Login and test payment setup

OnePiece uses existing Supabase Auth email/password accounts. See [email login setup](SUPABASE-LOGIN-SETUP.md), [Toss test setup](TOSS-TEST-SETUP.md), [Vercel limits](VERCEL-DEPLOYMENT.md) and [ERD implementation](ERD13-IMPLEMENTATION.md). Kakao and Google login are not active.

The server verifies an existing account and maps its managed Auth UUID into the local ID-only adapter and profiles. No remote account, DB, provider or setting is edited. Local guest carts merge after successful verification. Vercel login uses verified Auth cookies; member business persistence is a separate unfinished adapter, so Vercel orders/payments and profile/list writes are unavailable.

Locally, payments.payment_key VARCHAR(200), toss_order_id and confirm_idempotency_key and payment_transactions preserve the existing test-payment implementation. Amounts are calculated by the server and approval/cancellation responses are verified. There is no fake login or payment-success bypass. Real credentials remain outside Git.
