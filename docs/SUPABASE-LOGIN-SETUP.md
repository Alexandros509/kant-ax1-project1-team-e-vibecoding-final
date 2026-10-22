# OnePiece email login · 2026-10-22

The login page accepts an existing tester's email and password. Email is an account identifier; an address that looks like Gmail does not enable Google OAuth. There is no new-account registration, magic link, recovery email, Google or Kakao login action. The former Kakao endpoints return HTTP 410. /join remains a compatibility entry that explains that the test account already exists and shows the same login form.

## Existing accounts and project protection

Authentication → Users is the account source. A read-only dashboard check found existing synthetic testers with the Email provider and a confirmed timestamp. The displayed sample used the members.onepiece.test domain, not Gmail. A dashboard login does not sign the storefront in or reveal a tester's password. Knowing the account UUID or email is not enough to log in.

Do not create, delete, reset, confirm or edit any tester, provider, setting, DB table, policy or migration in this shared Supabase project as part of this change. No remote SQL is required for the email-login feature. Use the tester's previously assigned password; ask the team's account coordinator privately if it is unknown. Do not send recovery mail to synthetic addresses or put account lists/passwords in source control.

## Local environment

In this repository's ignored .env.local, set:

```dotenv
APP_ORIGIN=http://127.0.0.1:3019
ONEPIECE_SUPABASE_URL=https://your-project.supabase.co
ONEPIECE_SUPABASE_PUBLISHABLE_KEY=<existing publishable key>
```

Get the existing URL and publishable key from the project's Connect dialog. Do not generate a new key. This code deliberately uses server environment names without NEXT_PUBLIC_ because all Auth calls go through /api/shop. ONEPIECE_SUPABASE_ANON_KEY is an optional legacy fallback, only if ONEPIECE_SUPABASE_PUBLISHABLE_KEY is absent. Elevated secret/service_role keys are rejected and never needed. No database password or direct DB connection string is required.

Run npm run auth:check; it reports configuration presence and project host only, never the key value or a remote login. Restart the local Next.js server after editing environment variables. Review http://127.0.0.1:3019/login or /app-preview?screen=%2Flogin. A successful web login opens / and its original campaign; inside the app frame it opens the app's home. The web entry remains login-first.

## Vercel environment configuration

Add ONEPIECE_SUPABASE_URL (Config), ONEPIECE_SUPABASE_PUBLISHABLE_KEY (Config is sufficient for this non-elevated key; Secret is also supported), and APP_ORIGIN (Config, exact HTTPS domain without a trailing slash) to the intended deployment environment. The names must match the code. Existing Kakao environment variables are unused and do not enable login. No Kakao callback or Google/Gmail provider configuration is needed. Environment changes require a new deployment. Git publication does not upload .env.local or configure Vercel. No Vercel environment variable or shared Supabase setting is modified by this change.

## Verification and persistence boundary

Supabase verifies passwords through its official JS SDK. The server uses the SSR package for HTTP-only, SameSite=Lax cookies (Secure on HTTPS), verifies the user with getUser on subsequent API requests, refreshes expired tokens and rotates the local shop token at login. An arbitrary cookie/user UUID cannot identify a member. Passwords and Auth tokens are never returned in the API JSON, written to the product DB, or included in analytics. Invalid credentials get a generic error. Local throttling supplements the Auth project's existing limits and is not a shared production rate limiter.

On a local Node server, the managed Auth UUID is mirrored into the local ID-only auth.users adapter and profiles, with the existing guest-cart merge. This does not modify the remote Supabase DB. The local business schema remains the same 13-table ERD.

On Vercel, verified Auth cookies can restore the logged-in member after a function restart without a writable local DB. The catalog stays read-only and the bag is browser-based. Saved-list/profile writes and orders/payments still need a separately implemented external business-DB adapter; connecting Auth alone does not implement that adapter. Those unavailable operations do not report fake success, and Toss checkout is disabled there until business persistence is supplied. Consent and event-dedup state still use process memory. This is not a claim that the entire deployed purchase journey is ready for a final experiment.

Automated tests use a mocked Auth service, including incorrect credentials, forged cookies, server restart, refresh, logout and cross-origin rejection. They do not log into the shared project. A real tester password must be entered privately by the operator to verify a real sign-in; no password reset is part of this work. Ordinary user-initiated sign-in can update Auth's own last-sign-in/audit information.

References: [Supabase password login](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [SSR cookie setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [API key roles](https://supabase.com/docs/guides/api/api-keys).
