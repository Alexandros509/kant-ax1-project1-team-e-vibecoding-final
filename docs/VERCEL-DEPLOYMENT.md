# Localhost and Vercel deployment · 2026-10-22

Public Vercel catalog requests use the immutable fixture and never initialize a writable local DB. Local Node runs retain the same ERD/PGlite catalog. Login initialization is independent of the product request.

## Authentication versus business data

The new email login uses pre-created Supabase Auth accounts. HTTP-only Auth cookies are verified server-side and can restore the logged-in identity across Vercel function instances/restarts. The application never trusts an email/UUID supplied by the client as identity. Kakao endpoints return 410 and Google login is absent.

The remote business-DB adapter is still unfinished. On Vercel the bag is browser-based; saved member lists/profile writes and orders/payments remain unavailable until external persistence is implemented. Toss configuration alone is insufficient and checkout stays disabled there. Process-memory consent, throttling and event deduplication are not shared persistent stores. Do not label this a complete deployed purchase experiment. No shared DB schema, account or provider setting was changed.

Locally, the verified managed Auth UUID is mirrored to the ID-only adapter and profiles and the existing business tables/cart merge are used. No remote schema migration is needed for this Auth-only change. Do not point PGlite at /tmp or memory and call it persistent cloud storage.

## Environment variables

Keep .env.local outside Git. In Vercel Settings → Environment Variables add the intended Production/Preview scope:

- ONEPIECE_SUPABASE_URL: existing project URL, Config.
- ONEPIECE_SUPABASE_PUBLISHABLE_KEY: existing publishable key, Config or Secret. A privileged/admin key is not needed and is rejected. ONEPIECE_SUPABASE_ANON_KEY is an optional legacy fallback.
- APP_ORIGIN: exact stable HTTPS origin without a trailing slash, Config.
- TOSS_CLIENT_KEY / TOSS_SECRET_KEY: matching individual payment-window test keys; the Secret stays server-side. Business DB support is additionally required.
- NEXT_PUBLIC_GA_MEASUREMENT_ID: optional test measurement ID chosen by the team's GA owner.

Do not prefix server secrets with NEXT_PUBLIC_. This code uses server-only Supabase environment names even for the non-elevated publishable key. No Kakao callback or Gmail configuration is required. Redeploy after changing variables. The maintainer authorized Git publication after local review. The Git update itself does not configure Vercel environment variables or certify a completed deployment.

## Publication boundary

Use this sanitized release folder, not the separate private working source. It contains the fictional 366-card catalog, 59 maintainer-provided PNGs and the original AI campaign. Do not copy private environment files, real DB/backups, member lists/passwords or excluded reference-store media into a deployment. Rights statements remain in RIGHTS.md and THIRD_PARTY_NOTICES.md.

See [email login setup](SUPABASE-LOGIN-SETUP.md) and [Vercel environment variables](https://vercel.com/docs/environment-variables).
