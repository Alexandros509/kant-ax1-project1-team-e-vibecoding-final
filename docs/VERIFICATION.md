# Current verification — 2026-10-21 (ERD13 and local media)

This section supersedes the earlier catalog/schema/media counts below. Earlier records are retained as history.

- The 59 supplied PNG files were copied unchanged and their SHA-256 hashes compared with the supplied originals. All 59 are used across 366 fictional-named product cards, 1,280 variants and 1,478 gallery references. Product media no longer depends on external product-image URLs. Reused images are test illustrations and do not certify each card's exact color or style.
- The maintainer-created AI campaign video, poster and wordmark were restored unchanged. Browser observations showed the campaign moving between frames; the jacket marker opened its matching local-image detail page. A nine-image gallery advanced from image 1 to 2, size selection added an available option to the bag, and the bag retained its expected amount. Mobile checkout left the iframe and preserved the app navigation context. With provider keys absent, the login/payment requirements remained visible and payment stayed unavailable.
- The read-only ERD Cloud PostgreSQL export was implemented as 13 public business tables, 125 columns and 17 foreign keys. The export's auth_users placeholder maps to managed auth.users; a separate local-only Auth identity stub supports PGlite tests. Existing 26-table DB directories were not dropped or migrated. The default DB uses a fresh, versioned ignored directory.
- A fresh in-memory audit found 21 categories, 366 products, 1,280 variants and 1,478 image rows. Member/cart/favorite/recent/order/payment/transaction tables were empty. The Supabase seed contains catalog rows only and was generated in memory. Optional access policies were tested locally; no Supabase project was changed.
- All 17 automated tests passed, including schema/source alignment, catalog/media paths, member ownership, guest-cart merge, order snapshots/idempotency, mocked Kakao state, mocked Toss approval/cancellation reconciliation and GA event-contract checks. Production build and TypeScript checks passed. ESLint reported 0 errors and 1 existing image-optimization warning.
- The team's GA report was inspected using an already authenticated browser session. Report settings, saved comparisons, filters and administration were not changed. Site event names were aligned with the observed report contract. The B comparison still depends on the team's configured hostname; the site does not spoof it. Debug mode is opt-in, and manual page-view mode requires matching GA history-measurement settings to avoid duplicate events.
- Browser QA ran on an isolated local instance with blank Kakao/Toss/GA keys and a separate ignored DB. No real provider login/payment or GA data reception was tested. Mocked results are not provider certification. No Android build, Vercel deployment or cloud DB/Auth/session configuration was performed.
- The source still uses local-file PGlite and process-memory sessions/OAuth state. Vercel environment variables keep credentials out of GitHub, but a reliable Vercel purchase flow additionally requires an external DB and shared session/Auth adapter. See VERCEL-DEPLOYMENT.md.

- Final publication checks passed for 207 indexed files and 66 manifest-listed assets. The exact private provider-key comparison also passed without printing or copying the values. Credentials, DB files, backups and reference-store media are excluded.

---

# Publication verification — 2026-10-20

- Clean `npm ci` from the lockfile completed. Generated DB files and dependencies are ignored.
- 9 automated assertions/tests passed: list sorting/URLs, exact ERD schema, normalized synthetic catalog,
  guest/member cart ownership, canonical order totals/snapshots/idempotency, mocked Kakao state handling,
  mocked Toss approval retries/ownership/refund reconciliation, and price formatting.
- DB initialized from an empty in-memory instance: 26 tables, 159 columns, 31 foreign keys;
  12 styles, 36 color cards, 126 options/inventory rows, 108 image rows. All customer/order/payment tables were empty.
- Supabase seed was regenerated solely from this synthetic fixture in an in-memory DB, never from the original local DB.
- Next.js production build and TypeScript checking passed. Static lint reported no errors and 4 existing warnings
  (logout navigation and image/inline directive optimization warnings). These are not a proof of complete correctness.
- Production dependency audit (`npm audit --omit=dev`) is reported separately from development-tool advisories.

## Known development dependency advisory

After removing the unused shadcn CLI and preserving its required MIT CSS excerpt, the production dependency chain
does not contain the reported globbing vulnerability. The full development dependency audit still flags 5 package
entries in the `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces` chain.
These are propagation entries for the same underlying advisory, not five independent remotely reachable shop bugs.

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) reports stack exhaustion for deeply nested glob patterns
in braces <=3.0.3, with no patched version listed at preparation time. The CLI audit suggests a major downgrade of
the Next lint configuration; that incompatible downgrade was not applied. The storefront does not accept user-supplied
glob patterns. Run lint/build on trusted sources and revisit the tooling chain when an upstream compatible fix is available.
No claim of zero vulnerabilities or production readiness is made.

## Browser checks

The production server was started in a fresh publication folder. Initial parent-directory creation was fixed and rechecked without precreating the DB folder. Home garment links opened the synthetic detail page; local SVGs displayed, gallery navigation changed the image, size selection added the expected option to the bag, the cart drawer opened with the correct amount, and the unconfigured login page showed its unavailable state. The original port 3019 site uses a separate directory and DB.

## Limits

External provider calls are mocked in automated tests. Keys and real Kakao/Toss test transactions were not available.
GA4 data reception and a real randomly assigned A/B experiment have not been verified. No cloud deployment was performed.
The file checks and asset provenance manifest are publication safeguards, not a comprehensive security or legal audit.

## Update verification — 2026-10-21

- Production build, TypeScript checking and all 14 automated tests passed. The added tests cover app execution-surface labels, controlled click fields, test-only provider configuration, checkout handoff/expiry, and the row-preserving 100→200 payment-key migration. Existing ERD/cart/order/OAuth/payment tests still pass with the public synthetic fixture.
- ESLint reported 0 errors and 1 image-optimization warning in ProductDetail.tsx. No unrelated dependency upgrade was made.
- A separate production instance with no provider/GA keys and its own ignored local DB was checked in the browser: unauthenticated root redirected to /login; the official Kakao button showed the unavailable state; /app-preview displayed the fictional lookbook and direct product marker links; a size could be added to the bag; checkout exited the iframe to the top-level route, retained app navigation and showed the missing-login/key/notice requirements.
- The private source site's server, DB, credentials and media were not used for this browser run. The existing public synthetic fixture/artwork and relative-image handling remain intact.
- Real Kakao consent/callback completion and a complete Toss test approval were not executed from this public folder. Mocked success is not provider certification. No APK build, Vercel deployment or GA4 administration was performed.
- The Vercel guide explicitly records the unresolved local-file DB / process-memory session limitations; publishing the source is not a claim that a full serverless purchase flow is ready.
- Publication checks passed for 244 staged files and 113 manifest-listed assets, including the documented official Kakao button. The exact private provider-key comparison also passed without printing key values. DB files, actual credentials, backups and reference-store media are excluded.
