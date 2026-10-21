# Kakao Login setup

## 1. Local environment

Copy .env.example to .env.local in the project root. Fill only your own application values:

```dotenv
APP_ORIGIN=http://127.0.0.1:3019
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
```

Use the REST API key, not a JavaScript or Admin key. New REST keys enable Client Secret by default; use the matching Secret shown in your app console. If a legacy app explicitly disables Secret, follow that app's setting. Never add NEXT_PUBLIC_ to these variables or commit the populated file.

## 2. Kakao Developers console

1. Select the app corresponding to that REST key.
2. Enable Kakao Login (ON), and enable the intended web platform / register your test site as required by the console.
3. Register the exact Redirect URI for the REST key: http://127.0.0.1:3019/api/auth/kakao/callback .
4. Configure the app's required consent settings and use an authorized test account.
5. Restart the local server after changing environment variables, then start a fresh login.

For localhost:3000, set APP_ORIGIN=http://localhost:3000, run npm run dev -- --hostname localhost --port 3000, and register http://localhost:3000/api/auth/kakao/callback instead. Do not mix localhost and 127.0.0.1: browser cookies and redirect matching depend on the host.

Run npm run kakao:check to inspect presence/format without displaying keys or sending an authentication request. It does not prove that the remote console is correctly configured. An explicitly Secret-disabled legacy app may need manual review of the check's missing-Secret result.

## 3. Error diagnosis

- KOE004: confirm Kakao Login is ON for the app belonging to the REST key actually loaded by this server.
- KOE006: register exactly the redirect_uri used by the authorize request. Check protocol, hostname, port, path and trailing slash. Restart after changing APP_ORIGIN.
- Verify that key and Secret belong to the same app; changing a different Kakao app does not fix this site's request.

Web sign-in returns to /join for the profile. App-preview sign-in leaves the iframe, authenticates at the top level and returns to /app-preview. OAuth state is one-time, expires after ten minutes and is bound to the initiating session. Login does not require a client-supplied account ID or password.

The English yellow button is the unchanged official Kakao resource; see THIRD_PARTY_NOTICES.md and the asset manifest. This is a provider button, not ONEPIECE-owned artwork.

Sources: [app keys and Redirect URI](https://developers.kakao.com/docs/ko/app-setting/app), [login prerequisites and errors](https://developers.kakao.com/docs/ko/kakaologin/prerequisite), [button design guide](https://developers.kakao.com/docs/ko/kakaologin/design-guide).
