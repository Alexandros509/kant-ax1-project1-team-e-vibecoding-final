import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:3019';
const keyPresent = !!process.env.KAKAO_REST_API_KEY?.trim();
const secretPresent = !!process.env.KAKAO_CLIENT_SECRET?.trim();
console.log('ONEPIECE / Kakao REST login configuration');
console.log('File: ' + process.cwd() + '/.env.local');
console.log(
    'REST API key: ' +
        (keyPresent
            ? 'present (value hidden)'
            : 'MISSING: fill KAKAO_REST_API_KEY'),
);
console.log(
    'Client Secret: ' +
        (secretPresent
            ? 'present (value hidden)'
            : 'MISSING: new REST keys enable Client Secret by default; fill KAKAO_CLIENT_SECRET'),
);
let originValid = false;
try {
    const url = new URL(origin);
    originValid =
        url.origin === origin &&
        (url.protocol === 'https:' ||
            (url.protocol === 'http:' &&
                ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)));
} catch {
    /* Report without printing parser input. */
}
if (originValid)
    console.log(
        'Register Redirect URI: ' + origin + '/api/auth/kakao/callback',
    );
else
    console.log(
        'APP_ORIGIN: INVALID. Use the exact HTTP loopback or HTTPS site origin, without a trailing slash.',
    );
console.log(
    'This checks local values only. Verify Kakao Login ON, the registered Redirect URI and the key/Secret pair in your console.',
);
console.log('No authentication request is sent and no key value is printed.');
if (!keyPresent || !secretPresent || !originValid) process.exitCode = 1;
