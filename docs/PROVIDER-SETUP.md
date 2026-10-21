# Login and test payment setup

This release supports Kakao login only. Google login, email/password registration and temporary demo credentials are not included. No provider keys or real account records are supplied.

- [Kakao setup and KOE004 / KOE006](KAKAO-LOGIN-SETUP.md)
- [Toss Payments test setup](TOSS-TEST-SETUP.md)
- [Localhost and Vercel limits](VERCEL-DEPLOYMENT.md)
- [Mobile app flow simulation](APP-FLOW-GA4.md)

The first verified Kakao login creates or reuses an ERD customers row. Guest cart contents are linked or merged into the member cart. There is no Supabase Auth session. Sessions and OAuth state are currently process-local; a restart signs users out while customer/order rows remain in the local DB.

The payment flow is test-only and uses individual payment-window keys. Server-side approval verifies owner, order, amount, status and currency before recording completion. Visiting a success URL is not proof of a successful payment. Retries reuse a durable idempotency key. Provider refund-state reconciliation is present; a refund-request API and webhook are not.

The local schema widens payments.provider_payment_id from VARCHAR(100) to VARCHAR(200) for Toss compatibility. The checked, repeatable migration preserves rows and adds no table, column or relationship. The source ERD SQL remains unchanged, and the shared ERD Cloud was not edited. The Supabase migration file is provided for explicit application by a maintainer; it is not run against any cloud project automatically.
