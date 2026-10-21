# Third-party notices

## Upstream team project

This work derives from [Alexandros509/kant-ax1-project1-team-e](https://github.com/Alexandros509/kant-ax1-project1-team-e), including the original team UI and subsequent local implementation.
The upstream commit history remains the attribution record for contributors. This fresh publication history does not imply sole authorship by the snapshot committer.
The database follows the team-selected [ERD](https://www.erdcloud.com/d/xsTNMswWjSpfBkN5L); this is an attribution, not an assertion that the schema has an independent open-source license.

## Vendored shadcn CSS and generated component patterns

`src/app/ui-variants.css` is a small unmodified excerpt from the MIT-licensed shadcn 4.21.4 stylesheet.
The UI primitives in `src/shared/components/ui/` follow the team’s generated shadcn component patterns.
The upstream MIT copyright and permission notice is retained in [third-party/shadcn-MIT.txt](third-party/shadcn-MIT.txt).
This specific notice does not apply a new MIT license to all team code.
The unused shadcn CLI dependency was removed to avoid its vulnerable globbing dependency chain.

## JavaScript packages

Dependencies are installed using npm, not vendored here. Each package retains its own license, copyright and notice files.
The application’s UNLICENSED metadata does not apply to these packages. Keep upstream license/notice files with any later bundled distribution.
This inventory reports package metadata, not a legal conclusion about every file or trademark. Full installed-package metadata is in [docs/dependency-licenses.json](docs/dependency-licenses.json).

- `@base-ui/react` 1.9.0: MIT.
- `@electric-sql/pglite` 0.5.10: Apache-2.0.
- `@tailwindcss/turbopack` 4.3.3: MIT.
- `@types/node` 20.19.43: MIT.
- `@types/react` 19.3.0: MIT.
- `@types/react-dom` 19.3.0: MIT.
- `class-variance-authority` 0.7.1: Apache-2.0.
- `clsx` 2.1.1: MIT.
- `cn` 0.4.0: MIT.
- `eslint` 9.39.5: MIT.
- `eslint-config-next` 16.4.0: MIT.
- `lucide-react` 1.55.0: ISC.
- `next` 16.4.0: MIT.
- `prettier` 3.9.10: MIT.
- `prettier-plugin-tailwindcss` 0.8.1: MIT.
- `react` 19.3.0: MIT.
- `react-dom` 19.3.0: MIT.
- `react-icons` 5.7.0: MIT.
- `sass` 1.105.1: MIT.
- `tailwind-merge` 3.7.0: MIT.
- `tailwindcss` 4.3.3: MIT.
- `tsx` 4.23.15: MIT.
- `tw-animate-css` 1.4.0: MIT.
- `typescript` 5.9.3: Apache-2.0.
- `zustand` 5.0.15: MIT.

Kakao and Toss Payments are optional external integrations, not code or assets relicensed by this project.
Their SDK/API terms and trademarks remain applicable.

## Official Kakao Login button

`public/auth/kakao/kakao_login_en_large.svg` is the unchanged official English Kakao Login button, supplied by the maintainer from the provider design resources. It is used only to identify the Kakao sign-in action, including its unavailable state.
Kakao retains the artwork and trademark rights; it is not original ONEPIECE artwork and is not relicensed with this project. Follow the [Kakao Login design guide](https://developers.kakao.com/docs/ko/kakaologin/design-guide) for any later use, scaling or modification. Its checksum and provenance are recorded in `docs/asset-manifest.json`. This integration does not imply endorsement.

## Maintainer-supplied media

The 59 product PNGs were supplied for this update and are copied unchanged. The original campaign video was explicitly identified by the maintainer as their own AI production and restored at their request. These assets are not covered by the upstream dependency licenses or an invented blanket project license. File provenance and checksums are in docs/asset-manifest.json.
