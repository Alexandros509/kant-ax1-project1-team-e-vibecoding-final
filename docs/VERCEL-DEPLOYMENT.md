# Localhost and Vercel deployment

## Current status

GitHub publication is a source update, not a running Vercel deployment. This repository is verified as a local Node.js/PGlite demo. It is not yet a reliable full-flow Vercel application: catalog/session APIs initialize a local file DB, and sessions, OAuth state, consent/rate-limit state and event deduplication use process memory. File state and memory are not durable shared storage across Vercel function instances or restarts. Even catalog loading depends on this DB layer, so a successful build alone does not establish that deployed shopping routes work.

The UI and Next.js server route approach can be used on Vercel, and Kakao/Toss accept a correctly configured HTTPS app domain. To support the entire member/cart/order flow there, first replace local-file persistence with external PostgreSQL (for example a separately configured Supabase project), use a shared session/OAuth-state store, and review connections, transactions, authorization and concurrency. Pointing a path at /tmp or memory:// is not a persistent DB solution. The current SQL export does not perform that migration or configure Supabase Auth/RLS. No cloud schema changes were made.

## Environment variables are separate from GitHub

Do not upload .env.local. In the Vercel project, open Settings → Environment Variables and enter the needed names and values for the appropriate Production / Preview environments:

- APP_ORIGIN: the exact stable deployment origin, such as https://your-project.vercel.app, without a trailing slash.
- KAKAO_REST_API_KEY and KAKAO_CLIENT_SECRET: your matching server-side app credentials.
- TOSS_CLIENT_KEY and TOSS_SECRET_KEY: matching individual payment-window test keys only.
- NEXT_PUBLIC_GA_MEASUREMENT_ID: optional public measurement ID, configured by the team's GA4 owner for a test property.

Do not add NEXT_PUBLIC_ to Secret values. The Toss client key is intentionally passed to its browser SDK; its Secret must stay on the server. Environment changes apply to a new deployment: redeploy after updating values. Environment variables alone do not resolve the DB/session limitations above. A future external DB adapter will need its own server-side connection configuration; no unused DATABASE_URL is claimed to work in this version.

Register https://your-project.vercel.app/api/auth/kakao/callback exactly in the Kakao console. APP_ORIGIN controls both the OAuth callback and Toss success/failure URLs. Prefer a stable test domain; per-deployment Preview URLs require matching provider settings. Production and Preview must not accidentally share test participants, orders or analytics conditions.

## Which source folder to deploy

Use this sanitized public repository for any public preview. It contains fictional product data and original geometric SVGs, plus the documented official Kakao button. The private local working site contains reference content that is deliberately absent here. Do not copy its environment file, scraped product JSON, photos, external product-media URLs, video, DB or backups into Vercel.

Educational, noncommercial or clone labels do not grant content rights. For A/B comparisons, give both versions the same authorized fixture and image conditions. If reference-brand media must be used, establish the relevant permission before external testing. See RIGHTS.md; exclusion and attribution reduce risk but are not a guarantee of legal clearance.

References: [Vercel environment variables](https://vercel.com/docs/environment-variables), [local versus serverless behavior](https://vercel.com/kb/guide/why-does-my-serverless-function-work-locally-but-not-when-deployed), [Kakao app settings](https://developers.kakao.com/docs/ko/app-setting/app), [Copyright Act Article 35-5](https://law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=05&joNo=0035&lsiSeq=283335&urlMode=lsScJoRltInfoR).
