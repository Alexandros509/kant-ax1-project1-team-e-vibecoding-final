# ONEPIECE · Vibe Coding Final

팀 쇼핑몰 UI·구매 흐름을 확인하는 가상 브랜드 테스트 프로젝트입니다. 실제 상품 판매·배송·운영 결제를 제공하지 않습니다. 원본은 [팀 저장소](https://github.com/Alexandros509/kant-ax1-project1-team-e)이며 팀의 기여와 기존 권리 표기를 유지합니다.

## 이번 반영: 2026-10-21

- **366개 상품 카드 / 1,280개 사이즈 옵션**으로 구성했습니다. 기존 로컬 카탈로그의 순서·카테고리·사이즈·가격·가용성 조건을 유지하되 공개용 상품명과 브랜드는 가상 명칭입니다.
- 사용자 지정 폴더에서 제공된 **PNG 59개, 56,347,288바이트(약 53.7MiB)**를 변환·리사이즈 없이 그대로 복사했습니다. 366개 상품에 카테고리별 이미지 세트를 반복 사용하며 상세 갤러리 참조는 1,478개입니다. 실제 파일을 1,478개로 복제하지 않습니다.
- 상품 이미지는 모두 이 프로젝트의 public/images/products/에서 불러옵니다. 외부 상품 사진 URL과 이전 대체 상품 SVG는 현재 버전에서 제거했습니다. [상품별 이미지 연결표](docs/catalog-image-mapping.json)를 제공합니다.
- **메인 캠페인은 사용자가 직접 AI로 제작했다고 확인한 원래 영상**으로 복원했습니다. 영상·기존 포스터·ONEPIECE 워드마크는 public/campaign/에 보관하며 산산기어 수집 영상으로 분류하지 않습니다.
- 새로 지정한 [ERD](https://www.erdcloud.com/d/xsTNMswWjSpfBkN5L)에 맞춰 **업무 테이블 13개 / 컬럼 125개 / 외래 키 17개**를 적용했습니다. 공유 ERD Cloud 자체는 수정하지 않았습니다.

제공 이미지의 반복 사용은 모든 상품의 실제 디자인·색상과 일치한다는 의미가 아닙니다. 기존 외부 이미지 버전과 이 버전을 UI만의 효과로 비교하려면 양쪽에 동일 이미지·데이터 기준본을 사용하세요.

## 실행

Node.js 22 이상과 npm을 사용합니다.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3019
```

- 웹: [http://127.0.0.1:3019/](http://127.0.0.1:3019/) — 비로그인 첫 화면은 로그인으로 이동합니다.
- 모바일 앱 흐름: [http://127.0.0.1:3019/app-preview](http://127.0.0.1:3019/app-preview).
- 상품 목록 직접 확인: [http://127.0.0.1:3019/products](http://127.0.0.1:3019/products).
- 3000번에서 실행한다면 APP_ORIGIN과 실행 포트, 카카오 Redirect URI를 함께 localhost:3000으로 맞춥니다. 모바일 경로는 동일한 /app-preview입니다.

키가 없어도 목록·상세·게스트 장바구니와 앱 프리뷰를 확인할 수 있습니다. 로그인은 카카오만 제공하며 키 설정 전에는 비활성화됩니다. 토스도 설정 전에는 비활성화됩니다. 임시 계정·우회 로그인·결제 성공 우회 기능은 포함하지 않습니다.

```powershell
npm test
npm run lint
npm run build
npm run start -- --hostname 127.0.0.1 --port 3019
npm run release:check
```

## DB와 실제 연결 범위

- 로컬 PGlite의 새 기본 경로는 .local/onepiece-erd13-media-v3입니다. 이전 26개 테이블 DB는 삭제·덮어쓰기하지 않습니다. 기존 .env.local에 옛 LOCAL_DB_PATH가 있다면 새 빈 경로로 바꿔 실행하세요.
- ERD의 auth_users 표기는 Supabase의 관리 테이블 auth.users를 뜻합니다. **public.auth_users를 만들지 않습니다.** 로컬에서만 auth 스키마에 ID 전용 대체 테이블을 만들고, 업무 테이블 13개와 분리합니다.
- 로컬 카카오 로그인은 검증된 제공자 subject에서 로컬 UUID를 만들고 profiles와 연결합니다. 실제 Supabase Auth의 사용자 UUID 매핑을 구현했다고 주장하지 않습니다.
- 게스트 장바구니는 브라우저와 일시적인 서버 메모리에서 유지하고, 로그인 후 회원 carts/cart_items로 합칩니다. 회원 관심·최근 본 상품은 favorites/recent_product_views에 저장하며 소유자를 서버에서 검증합니다.
- 상품 카드·옵션·이미지는 products/product_variants/product_images, 주문 당시 값은 order_items, 토스 결제 시도와 승인·취소 거래 이력은 payments/payment_transactions에 저장합니다. 금액은 서버가 계산하고 재시도는 멱등키로 연결합니다.
- 상품별 고유한 storage_path는 논리 객체 경로입니다. 로컬 resolver가 이를 공유 PNG 59개의 실제 주소로 해석합니다. 원격 Storage 버킷을 생성하거나 업로드한 것은 아닙니다.
- 색상 표시와 사이즈표는 기존 카탈로그의 화면 메타데이터를 사용하며, 이를 위해 ERD 밖 컬럼이나 테이블을 추가하지 않았습니다.

[ERD 적용 기록](docs/ERD13-IMPLEMENTATION.md)에 SQL 변환·관계·제약조건과 남은 연결 작업을 기록했습니다. 현재 Supabase 마이그레이션 폴더는 새 프로젝트용 13개 업무 테이블 기준입니다. 이전 SQL은 docs/legacy-schema에 보존하며 새 DB에 함께 적용하지 마세요.

npm run db:export는 항상 **새 메모리 DB의 공개 상품만** seed.sql로 내보내며 실제 회원·주문 DB를 내보내지 않습니다. db:audit는 구조와 행 수만 기록합니다. 초기화 명령 db:reset은 명시적 확인 플래그가 있어야 실행되고 새 기본 DB 경로로 제한됩니다. 이번 업데이트에서는 기존 DB 초기화를 실행하지 않았습니다.

## 모바일·GA4

모바일은 /app-preview 경로와 선택적인 screen 쿼리로 구분합니다. 룩북의 JACKET·PANTS 마커는 상세로, VIEW OUTFIT은 상품 시트로 연결됩니다. 로그인과 결제는 iframe 밖으로 이동합니다. APK 빌드나 설치 앱 배포를 의미하지 않습니다.

GA4는 팀이 설정하는 테스트 측정 ID와 동의가 있어야 전송합니다. 확인한 팀 보고서의 이벤트 이름에 맞춰 조회·선택·장바구니·체크아웃·버튼 이벤트를 보강했습니다. **GA 보고서·비교·필터·속성·계정 설정은 변경하지 않았습니다.**

- 웹과 앱은 execution_surface=web / app_preview, 앱 흐름은 flow_id=onepiece_app_flow_v1로 구분합니다.
- ?preview=A/B는 화면 검토 전용으로 분석·결제를 제외합니다. 앱 실행 주소에 이 쿼리를 붙이지 마세요.
- 디버그는 NEXT_PUBLIC_GA_DEBUG_MODE=true일 때만 켭니다. 기본값은 꺼짐입니다.
- 페이지 조회 기본값은 Google 초기/히스토리 측정(auto)입니다. 현재 GA의 향상된 측정 설정에 맞춰 필요한 경우에만 NEXT_PUBLIC_GA_PAGEVIEW_MODE=manual을 선택하고 중복을 검증하세요.
- 팀 보고서의 B안 호스트 조건과 새 Vercel 도메인은 자동으로 같아지지 않습니다. 앱에서 호스트를 바꾸어 기록하지 않으며 실제 배포 도메인이 비교 조건에 맞아야 합니다.

[모바일 주소·실행 구분](docs/APP-FLOW-GA4.md), [GA 보고서와 코드 대응](docs/GA4-REPORT-COMPATIBILITY.md)을 확인하세요. 무작위 A/B 배정·고정 배정·표본 계산·결과 판정 플랫폼을 완성한 상태는 아닙니다. 테스트 purchase는 실제 매출이 아닙니다.

## 카카오·토스·Vercel

[로그인·결제 설정](docs/PROVIDER-SETUP.md)에 환경변수와 리다이렉트 주소를 정리했습니다. .env.local과 실제 키는 GitHub에 올리지 않습니다. Vercel에서는 프로젝트 환경변수로 별도 입력합니다.

Vercel에서는 공개 기준본으로 상품 366개를 읽기 전용 조회하므로 화면을 열 때 로컬 DB를 만들지 않습니다. 로컬 실행에서는 ERD DB를 계속 사용하며 두 결과의 상품·가격·옵션 ID·이미지 일치를 테스트합니다. 로그인 화면 초기화도 상품 조회와 분리했습니다.

**전체 구매 흐름의 Vercel 운영은 아직 별도 작업입니다.** 로컬 파일 DB와 메모리 세션/OAuth state를 외부 PostgreSQL·공유 세션·실제 Supabase Auth 매핑으로 전환해야 합니다. 이번에는 Vercel 배포나 Supabase SQL 원격 실행을 수행하지 않았습니다. [배포 범위와 제한](docs/VERCEL-DEPLOYMENT.md)을 읽어주세요.

## 공개 범위와 권리·백업

사용자 제공 PNG와 자체 AI 캠페인은 명시한 요청에 따라 포함했습니다. 제공 사실을 이미지 전체의 독자적 창작·배포 라이선스에 대한 별도 검증으로 표현하지 않습니다. 파일별 출처·해시는 [asset-manifest.json](docs/asset-manifest.json)에 기록합니다.

산산기어 등 참고 사이트의 기존 외부 상품 사진·로고·수집 설명·원문 JSON/HTML, 실제 DB·백업·키는 제외합니다. 학습·비영리 표기는 이용 허락이나 법적 면책이 아닙니다. 팀 코드에 새 오픈소스 라이선스를 임의로 부여하지 않았습니다. [RIGHTS.md](RIGHTS.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하세요.

실제 백업은 저장소 밖에 보관하고 저장소에는 backups/README.md 안내만 둡니다. release:check는 staged 파일의 비밀 패턴·금지 경로·외부 상품 이미지 URL·명시적으로 허용한 미디어의 형식과 해시를 검사합니다. 자동 검사는 모든 권리나 비밀을 판정하지 못합니다. [검증 기록](docs/VERIFICATION.md)에 실제 확인 범위를 구분합니다.
