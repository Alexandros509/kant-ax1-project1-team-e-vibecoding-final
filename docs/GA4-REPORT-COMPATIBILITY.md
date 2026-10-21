# GA4 보고서와 사이트 코드 대응 — 2026-10-21

사용자가 지정한 「ONEPIECE A·B·C 행동 비교」 보고서를 기존 로그인 세션으로 읽기 전용 확인했습니다. 보고서·비교 조건·필터·GA 속성·계정 설정을 수정하거나 테스트 이벤트를 그 속성에 주입하지 않았습니다. 개인 계정 정보와 실제 집계 수치는 이 공개 문서에 저장하지 않습니다.

## 실제 배포 호스트 조건

현재 B안 비교는 호스트 이름에 projectetestasite.jihyunkims495.chatgpt.site가 포함되는 조건입니다. 기본 보고서 호스트 필터에는 일부 Vercel 호스트도 있으나 B안 비교 조건과 별개입니다. 새로운 Vercel 도메인의 이벤트가 기존 B안 비교에 자동 포함되는 것으로 보아서는 안 됩니다. 이 코드는 실제 origin을 기록하며 다른 도메인으로 위장하지 않습니다. GA 조건을 그대로 유지하려면 실제 사용 배포 도메인도 그 조건과 맞아야 합니다.

## 이름과 발생 시점

- page_view: 기본 auto 모드는 Google 초기 조회 및 구성된 히스토리 측정을 사용합니다. manual 모드를 선택하면 앱이 경로별로 직접 보냅니다. 현재 GA 향상된 측정과 중복/누락 여부를 팀이 확인해야 합니다.
- navigation_click / select_item: 실제 내비게이션 및 상품 선택.
- view_item_list / view_item / view_cart / begin_checkout: 목록·상세·장바구니·내용이 있는 체크아웃 진입. 장바구니 패널을 열 때도 view_cart를 보냅니다.
- select_variant / grid_change / sort_change / product_info_toggle: 사이즈, 표시 열 수, 정렬, 상세 안내·사이즈표 조작.
- cart_drawer_open / cart_drawer_close / view_cart_click / checkout_click: 패널 열림·닫힘과 이동 클릭을 구분합니다.
- add_to_cart_attempt / add_to_cart / feature_unavailable: 담기 시도, 실제 브라우저 장바구니에 반영된 담기, 사이즈 누락·수량 제한 등을 구분합니다. add_to_cart는 결제나 주문 완료를 뜻하지 않습니다.
- cart_quantity_change / remove_from_cart / payment_button_click: 수량·삭제·테스트 결제 시작 버튼 조작.
- purchase: 실제 서버의 테스트 승인 확인 뒤에만 기록합니다. URL 방문만으로 성공 처리하지 않습니다.
- scroll / user_engagement / session_start / first_visit: Google 자동 측정 항목입니다. 코드를 맞춘다는 이유로 가짜 이벤트를 수동 생성하지 않습니다.

기존 ui_click은 통제된 ui_target을 담는 세부 이벤트로 유지합니다. 이벤트 총계는 계측 항목 수에 영향을 받으므로 UI 개선 효과는 동일 정의의 이벤트별 사용자/전환 흐름으로 비교해야 합니다. UI에 없는 기능의 이벤트나 실험 성공 수치를 만들지 않습니다.

## 모바일과 환경변수

앱은 동일 origin의 /app-preview이며 선택적인 screen 쿼리가 초기 화면을 지정합니다. 실제 페이지는 iframe 안의 /products, /products/<ID>, /cart 등이고 결제는 최상위 /checkout입니다. execution_surface=app_preview와 flow_id=onepiece_app_flow_v1을 함께 전달하며 일반 웹은 execution_surface=web입니다. is_test=1은 두 환경에 모두 붙으므로 모바일 구분용이 아닙니다.

NEXT_PUBLIC_GA_MEASUREMENT_ID는 팀 테스트 속성 값으로 운영자가 설정합니다. NEXT_PUBLIC_GA_DEBUG_MODE=true일 때만 debug_mode가 붙고 기본값은 꺼짐입니다. NEXT_PUBLIC_GA_PAGEVIEW_MODE=manual은 팀이 현 GA의 히스토리 조회 조건과 맞춘 경우에만 사용합니다. 기본 auto 모드는 해당 GA 설정에 의존하므로 코드 빌드 성공만으로 수신 완료를 보장하지 않습니다.

초기 GA 설정 및 직접 전송 이벤트의 page_location에는 실제 origin과 경로만 사용하며, OAuth·결제 콜백의 쿼리/해시는 제거합니다. 이후 자동 히스토리 측정의 동작은 현 GA 설정과 함께 확인해야 합니다. 주소·전화·이메일·계정 식별자를 이벤트에 넣지 않습니다. ?preview=A/B는 분석·결제를 제외하는 UI 검토 모드입니다. GA 사용자 정의 차원·필터·키 이벤트의 등록이나 변경은 팀의 담당 범위로 남겼습니다.
