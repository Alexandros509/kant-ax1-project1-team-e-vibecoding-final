# Kakao integration retired · 2026-10-22

This project now uses [OnePiece email/password login](SUPABASE-LOGIN-SETUP.md) for pre-created Supabase Auth testers. Kakao buttons and official artwork were removed from the current tree. The old authorization/callback endpoints return HTTP 410 and do not contact Kakao. KAKAO_REST_API_KEY and KAKAO_CLIENT_SECRET are no longer read by the application. Historical verification entries describe earlier versions only.

Do not change any external Kakao or Supabase setting to implement this local login-screen change. Existing cloud settings and historical Git commits are not deleted.
