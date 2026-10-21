# Login and test payment setup

Kakao is the only login provider. See [Kakao setup](KAKAO-LOGIN-SETUP.md), [Toss test setup](TOSS-TEST-SETUP.md), [Vercel limits](VERCEL-DEPLOYMENT.md) and [ERD implementation](ERD13-IMPLEMENTATION.md).

Verified local Kakao identities are mapped through the local ID-only auth.users adapter into profiles. This is not a claim that Supabase Auth is configured. Guest carts are merged into the member's carts/cart_items after verification. Member favorites and recent views use their ERD tables and owner checks.

The new ERD uses payments.payment_key VARCHAR(200), toss_order_id and confirm_idempotency_key; approval/cancellation records use payment_transactions with unique transaction_key. orders.status is submitted/cancelled and the provider's payment status is kept separately. No old provider_payment_id or refunds table is used by the current code.

Secrets remain outside Git. Key prefixes alone do not prove matching merchants or end-to-end provider success. Test payments are server-verified; there is no fake success or authentication bypass. Actual cloud configuration, transactions and delivery are outside this publication update.
