# Current verification — 2026-10-22 (clone conditions)

- Compared the pinned clone reference at 5fb0017 against all 366 mapped cards and 1,280 options. Price, color and size already matched; ten availability flags were corrected (five available and five unavailable). The release fixture, catalog seed, snapshot metadata and asset checksum were updated. Reference product names, photos and descriptions were not copied.
- Existing fictional names, local PNG/video bytes, logical IDs, list order and login-first web entry were preserved. The ERD13 structure and real DB files were not modified. The optional targeted SQL patch touches only the ten reviewed DEMO inventory rows and uses 0/100000 as test markers, not merchant inventory quantities.
- The catalog seed was executed in a fresh memory DB and checked against all 1,280 fixture options. The targeted patch was applied twice to a simulated prior state; mock member/cart rows were preserved. The existing 18-test suite and production build were checked after this data change.

# Earlier verification — 2026-10-21 (ERD13 and local media)

This section supersedes the earlier catalog/schema/media counts below. Earlier records are retained as history.

- The 59 supplied PNG files were copied unchanged and their SHA-256 hashes compared with the supplied originals. All 59 are used across 366 fictional-named product cards, 1,280 variants and 1,478 gallery references. Product media no longer depends on external product-image URLs. Reused images are test illustrations and do not certify each card's exact color or style.
- The maintainer-created AI campaign video, poster and wordmark were restored unchanged. Browser observations showed the campaign moving between frames; the jacket marker opened its matching local-image detail page. A nine-image gallery advanced from image 1 to 2, size selection added an available option to the bag, and the bag retained its expected amount. Mobile checkout left the iframe and preserved the app navigation context. With provider keys absent, the login/payment requirements remained visible and payment stayed unavailable.
- The read-only ERD Cloud PostgreSQL export was implemented as 13 public business tables, 125 columns and 17 foreign keys. The export's auth_users placeholder maps to managed auth.users; a separate local-only Auth identity stub supports PGlite tests. Existing 26-table DB directories were not dropped or migrated. The default DB uses a fresh, versioned ignored directory.
- A fresh in-memory audit found 21 categories, 366 products, 1,280 variants and 1,478 image rows. Member/cart/favorite/recent/order/payment/transaction tables were empty. The Supabase seed contains catalog rows only and was generated in memory. Optional access policies were tested locally; no Supabase project was changed.
- All 18 automated tests passed, including schema/source alignment, catalog/media paths, a DB-independent Vercel catalog, exact published/local catalog parity, member ownership, guest-cart merge, order snapshots/idempotency, mocked Kakao state, mocked Toss approval/cancellation reconciliation and GA event-contract checks. Production build and TypeScript checks passed. ESLint reported 0 errors and 1 existing image-optimization warning.
- The team's GA report was inspected using an already authenticated browser session. Report settings, saved comparisons, filters and administration were not changed. Site event names were aligned with the observed report contract. The B comparison still depends on the team's configured hostname; the site does not spoof it. Debug mode is opt-in, and manual page-view mode requires matching GA history-measurement settings to avoid duplicate events.
- Browser QA ran on an isolated local instance with blank Kakao/Toss/GA keys and a separate ignored DB. No real provider login/payment or GA data reception was tested. Mocked results are not provider certification. No Android build, Vercel deployment or cloud DB/Auth/session configuration was performed.
- The source still uses local-file PGlite and process-memory sessions/OAuth state. Vercel environment variables keep credentials out of GitHub, but a reliable Vercel purchase flow additionally requires an external DB and shared session/Auth adapter. See VERCEL-DEPLOYMENT.md.

- Final publication checks passed for 207 indexed files and 66 manifest-listed assets. The exact private provider-key comparison also passed without printing or copying the values. Credentials, DB files, backups and reference-store media are excluded.

## Vercel public-browsing recovery — 2026-10-21

- Read-only checks of the deployed site found guest session HTTP 200, catalog HTTP 500, and campaign/product media HTTP 200. The client previously discarded both startup results when only the catalog failed, leaving the home screen at its refresh message.
- VERCEL=1 now selects a public read-only catalog generated from the same release fixture as the ERD seed. It never initializes a DB. An automated test points LOCAL_DB_PATH at an existing file to prove that public browsing does not require a writable DB directory; the exact 366-card result is also compared with a fresh ERD-backed catalog.
- The session result is applied independently. The account screen waits only for its session, rather than product loading. Local production browser checks confirmed root-to-login navigation even with an intentionally failing catalog API. A separate Vercel-mode instance returned all 366 products and displayed the mobile AI campaign and garment links with an unusable DB path.
- Full tests (18), production build, TypeScript and lint for the changed code passed. Browser checks used blank provider/GA keys, did not accept analytics consent and made no real authentication/payment request. Existing DBs and media were unchanged. Remote login persistence, OAuth state sharing and payment storage remain separate work.

## Build-environment regression — 2026-10-21

- The provider integration test inherited APP_ORIGIN from the build host while only substituting test API keys. A malformed inherited origin (for example an HTTPS address with a trailing slash) reproduced the reported prepareToss failure before the fix.
- The mocked provider test now saves, sets and restores all five provider configuration variables, including a fixed HTTPS test origin and fake Kakao Client Secret. Assertions verify that both OAuth and payment callback URLs use the controlled test origin. No real provider request is made.
- Runtime origin/key validation and the prebuild test gate remain enabled. Tests explicitly retain rejection of trailing-slash origins and values that accidentally include APP_ORIGIN= in the value field. A passing mocked test does not validate the Vercel project's actual secret values, callback registration or DB/session setup.
- The previously failing tests passed after the fix with deliberately invalid inherited origin and provider-key values. The full 17-test suite and production build were then checked under the same inherited settings. Existing UI/media/schema behavior was not changed.

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
