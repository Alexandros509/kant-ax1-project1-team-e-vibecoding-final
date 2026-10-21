# 모바일 접속 주소와 실행 구분

동일 도메인의 /app-preview가 모바일 앱 흐름입니다. 3019번 로컬 실행은 http://127.0.0.1:3019/app-preview, 3000번 실행은 http://localhost:3000/app-preview입니다. 실제 배포 도메인은 별도로 확인해야 하며 GitHub 업로드가 배포 완료를 뜻하지 않습니다.

초기 화면 쿼리 예: /app-preview?screen=%2Fproducts (목록), /app-preview?screen=%2Fproducts%2F366 (366번 상세), /app-preview?screen=%2Fcart (장바구니), /app-preview?screen=%2Flogin (로그인). 일반 웹과 같은 도메인을 사용하며 임의 외부 URL을 screen으로 허용하지 않습니다.

원래 자체 AI 제작 캠페인 영상, JACKET·PANTS 상세 바로가기, VIEW OUTFIT 시트와 Home·Shop·Bag·My 내비게이션을 사용합니다. 화면은 최대 430px 프레임이며 APK·에뮬레이터가 아닌 웹 시뮬레이션입니다. 로그인과 결제는 iframe 밖에서 진행하고 앱으로 돌아오는 링크를 제공합니다.

GA의 앱 구분값은 execution_surface=app_preview와 flow_id=onepiece_app_flow_v1입니다. 일반 웹은 web, 실제 Android 식별자가 있는 쉘은 android_webview입니다. 디버그는 이제 NEXT_PUBLIC_GA_DEBUG_MODE=true일 때만 사용합니다. ?preview=A/B는 이 앱 경로와 다른 UI 검토 기능이며 측정과 결제를 제외합니다.

앱 안의 실제 상품 경로와 최상위 /checkout까지 이어지므로 /app-preview 경로 필터만으로 전체 여정을 묶지 마세요. [GA 보고서와 코드 대응](GA4-REPORT-COMPATIBILITY.md)에 실제 호스트 비교 조건, 이벤트 이름, 페이지 조회 모드와 검증 제한을 정리했습니다. GA 관리 설정은 변경하지 않았습니다.
