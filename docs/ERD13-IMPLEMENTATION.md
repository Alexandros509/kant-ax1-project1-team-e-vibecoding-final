# ERD13 적용 기록 — 2026-10-21

기준은 [ONEPIECE 기본 기능 최소안 · Toss TEST](https://www.erdcloud.com/d/xsTNMswWjSpfBkN5L)입니다. PostgreSQL, PK/FK 및 비식별 FK를 포함하는 SQL 미리보기를 읽어서 db/erdcloud-source.sql로 보존했습니다. 공유 다이어그램은 수정하지 않았습니다.

## 구조

업무 테이블 13개, 컬럼 125개, 외래 키 17개입니다. SQL 내보내기의 auth_users는 외부 관리 테이블 표기이므로 업무 테이블에서 제외하고 auth.users로 연결합니다. 로컬 PGlite는 db/local-auth.sql의 ID 전용 대체 관계를 사용하며 Supabase용 SQL에는 auth.users 생성 구문이 없습니다.

- 회원: profiles. 카카오 제공자 검증 후 로컬 Auth ID와 프로필을 연결합니다.
- 카탈로그: categories / products / product_variants / product_images. 상품 카드는 색상별 366개, 사이즈 옵션 1,280개입니다.
- 개인 목록: favorites / recent_product_views. 회원 데이터는 서버에서 현재 세션의 소유자로 제한하고, 게스트는 브라우저 저장을 사용합니다.
- 장바구니: carts / cart_items. 회원당 하나, 옵션 중복은 수량으로 합칩니다. 로그인 때 게스트의 현재 내용을 회원 장바구니에 연결합니다.
- 주문: orders / order_items. 서버 계산 금액, 주문 제출 멱등키, 상품명·옵션·단가·이미지 경로 스냅샷을 보존합니다.
- 결제: payments / payment_transactions. 내부 주문과 토스 결제 시도 주문번호를 분리하며 payment_key 최대 200자, 승인 요청 멱등키, 승인·취소 거래 고유 키와 금액을 저장합니다.

## 실행 SQL에 보강한 ERD 주석 조건

정수 자동 ID, 생성식 line_total, 가격/수량/재고 검사, 회원-상품·회원-카트·옵션의 고유 조건, main/hover 최대 한 장, 결제 키·거래 키·제출 멱등키의 고유 조건을 구현했습니다. 카테고리는 자기 참조·순환·3단계 구성을 막습니다. 활성 상품은 자신과 상위 카테고리가 모두 활성일 때만 공개합니다.

회원 탈퇴와 관련한 favorites/recent/cart/profile 삭제는 CASCADE, 주문 회원 연결은 SET NULL입니다. 과거 주문·결제 및 참조 중인 옵션은 기본 RESTRICT로 보존합니다. 실제 운영 탈퇴·취소 UI/API를 완성한 것은 아닙니다.

## 이미지 재사용

product_images에는 1,478개 참조를 저장하지만 실제 PNG는 59개입니다. storage_path는 products/<상품ID>/<파일명> 형태의 고유한 논리 경로이며 original_name/mime_type/file_size에는 실제 PNG 메타데이터가 들어갑니다. 로컬 imagePublicUrl resolver가 이를 /images/products/<파일명>으로 해석하여 같은 바이트와 브라우저 캐시를 공유합니다. signed URL이나 외부 CDN 주소를 저장하지 않습니다.

Supabase Storage를 실제로 사용할 때에는 이 논리 경로와 버킷 객체를 맞추거나 같은 공유 파일 resolver를 유지해야 합니다. SQL 파일만으로 버킷이 생성·업로드되지는 않습니다. 색상·사이즈표는 정적 fixture의 화면 메타데이터로 남기며 ERD 밖 테이블을 만들지 않습니다.

## 보존과 적용 범위

새 기본 DB 경로는 .local/onepiece-erd13-media-v3입니다. 옛 26개 테이블 DB를 DROP하거나 데이터 이전을 수행하지 않았습니다. 옛 DB 경로가 명시되어 있으면 구조 불일치로 중단하므로 새 경로를 선택해야 합니다. 이전 SQL은 docs/legacy-schema에 보존했습니다. 새 Supabase baseline은 빈 프로젝트에 대한 준비물이며 기존 26개 테이블 DB에 그대로 실행하는 변경 마이그레이션이 아닙니다.

Supabase RLS SQL은 로컬 PostgreSQL의 anon/authenticated 역할과 auth.uid 대체 함수를 사용해 소유자 격리·결제 직접 쓰기 차단을 테스트합니다. 실제 클라우드에는 적용하지 않았습니다. 운영 Supabase Auth 사용자 UUID·서버 세션·연결 풀·스토리지 연결은 아직 별도 구현입니다. 로컬 ID 전용 auth.users는 운영 인증 서비스가 아닙니다.
