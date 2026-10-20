# Optional provider setup

## Kakao login

1. Create your own application in [Kakao Developers](https://developers.kakao.com/). Configure its consent settings and redirect URI for your test app.
2. Register `http://127.0.0.1:3019/api/auth/kakao/callback` exactly. Do not mix localhost and 127.0.0.1.
3. Set `APP_ORIGIN`, `KAKAO_REST_API_KEY`, and the optional `KAKAO_CLIENT_SECRET` in `.env.local`. Restart the server.
4. The first verified Kakao login creates an ERD `customers` row keyed by the provider subject. No password registration table is created.
5. Use an authorized test account. Credentials are not included in the repository. Basic browsing remains available without configuring Kakao.

Reference: [Kakao Login REST API](https://developers.kakao.com/docs/latest/en/kakaologin/rest-api).

## Toss Payments test mode

1. Create your own developer test application at [Toss Payments](https://developers.tosspayments.com/).
2. Use the API individual payment-window integration. Set `TOSS_CLIENT_KEY=test_ck_...` and `TOSS_SECRET_KEY=test_sk_...` in `.env.local`. These are format examples, not keys.
3. The code rejects production `live_` keys. The secret key is server-side only. Do not prefix it with NEXT_PUBLIC_.
4. Success/failure URLs are constructed from `APP_ORIGIN`: `/checkout/success` and `/checkout/fail`.
5. The server derives prices from DB rows, binds the payment to the member and pending order, and verifies the provider response before recording completion. A success URL alone is not proof of approval.
6. Retry uses the stored payment idempotency key. State reconciliation can record provider refunds; this is not a cancellation request API or webhook.

The ERD restricts `provider_payment_id` to 100 characters while the provider may support longer values. Oversized values are rejected; changing the shared ERD is a separate team decision.
Never use real delivery details. Do not claim provider certification or production readiness.

Reference: [Toss Payments API](https://docs.tosspayments.com/reference).

## Database / sessions

This is a local single-process demo. A process restart clears sessions and OAuth state. Your persisted customer/order rows remain in PGlite.
There is no Supabase Auth session or production session store, and no server key is included. SQL export is not a cloud deployment.
