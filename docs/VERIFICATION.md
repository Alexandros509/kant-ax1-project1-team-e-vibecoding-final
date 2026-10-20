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
