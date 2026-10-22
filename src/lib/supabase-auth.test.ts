import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET, POST, sameOrigin } from '../app/api/shop/route';
import { supabaseAuthConfig } from './supabase-auth';
import { GET as retiredKakao } from '../app/api/auth/kakao/route';

const origin = 'https://onepiece.test';
const userId = 'aabbccdd-1122-4344-8566-778899aabbcc';
const user = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'tester@example.test',
    email_confirmed_at: '2026-10-20T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: 'Test member' },
    created_at: '2026-10-20T00:00:00Z',
};
const jwt = (offset = 3600) =>
    [
        Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
            'base64url',
        ),
        Buffer.from(
            JSON.stringify({
                sub: userId,
                exp: Math.floor(Date.now() / 1000) + offset,
                iat: Math.floor(Date.now() / 1000),
                aud: 'authenticated',
                role: 'authenticated',
                session_id: 'unit-session',
            }),
        ).toString('base64url'),
        'unit-signature',
    ].join('.');
const req = (body?: object, cookie = '', requestOrigin = origin) =>
    new NextRequest(origin + '/api/shop' + (body ? '' : '?action=session'), {
        method: body ? 'POST' : 'GET',
        headers: {
            'Content-Type': 'application/json',
            'x-shop-request': '1',
            origin: requestOrigin,
            ...(cookie ? { cookie } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
function cookieJar(response: Response) {
    return (response as Awaited<ReturnType<typeof GET>>).cookies
        .getAll()
        .filter((c) => c.value)
        .map((c) => c.name + '=' + c.value)
        .join('; ');
}
function environment() {
    const names = [
        'ONEPIECE_SUPABASE_URL',
        'ONEPIECE_SUPABASE_PUBLISHABLE_KEY',
        'ONEPIECE_SUPABASE_ANON_KEY',
        'APP_ORIGIN',
        'VERCEL',
        'LOCAL_DB_PATH',
        'TOSS_CLIENT_KEY',
        'TOSS_SECRET_KEY',
    ] as const;
    const previous = names.map((n) => [n, process.env[n]] as const);
    process.env.ONEPIECE_SUPABASE_URL = 'https://auth-unit.supabase.co';
    process.env.ONEPIECE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_unit';
    delete process.env.ONEPIECE_SUPABASE_ANON_KEY;
    process.env.APP_ORIGIN = origin + '/';
    process.env.VERCEL = '1';
    process.env.LOCAL_DB_PATH = 'package.json';
    delete process.env.TOSS_CLIENT_KEY;
    delete process.env.TOSS_SECRET_KEY;
    return () => {
        for (const [n, v] of previous) {
            if (v === undefined) delete process.env[n];
            else process.env[n] = v;
        }
    };
}
test('password auth rejects elevated keys and cross-origin login; Kakao routes are retired', async () => {
    const restore = environment();
    try {
        assert.ok(supabaseAuthConfig());
        process.env.ONEPIECE_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_forbidden';
        assert.equal(supabaseAuthConfig(), null);
        process.env.ONEPIECE_SUPABASE_PUBLISHABLE_KEY = jwt();
        assert.equal(supabaseAuthConfig(), null);
        assert.equal(sameOrigin(req({}, '', origin)), true); // A harmless trailing slash in configuration is canonicalized.
        assert.equal(
            (await POST(req({ action: 'login' }, '', 'https://foreign.test')))
                .status,
            403,
        );
        assert.equal(retiredKakao().status, 410);
    } finally {
        restore();
    }
});
test('password failure never creates a member or echoes credentials and cannot accept a client user ID', async () => {
    const restore = environment(),
        original = globalThis.fetch;
    let calls = 0;
    try {
        globalThis.fetch = async (input, init) => {
            calls++;
            assert.equal(
                String(input),
                'https://auth-unit.supabase.co/auth/v1/token?grant_type=password',
            );
            const body = JSON.parse(String(init?.body));
            assert.equal(body.email, 'tester@example.test');
            assert.equal(body.password, 'wrong-password');
            assert.equal('user_id' in body, false);
            return Response.json(
                {
                    error_code: 'invalid_credentials',
                    msg: 'private provider diagnostics',
                },
                { status: 400 },
            );
        };
        const failure = await POST(
            req({
                action: 'login',
                email: ' tester@example.test ',
                password: 'wrong-password',
                user_id: userId,
            }),
        );
        assert.equal(failure.status, 400);
        const text = await failure.text();
        assert.ok(
            !text.includes('wrong-password') &&
                !text.includes('private provider diagnostics') &&
                !text.includes('tester@'),
        );
        assert.equal(
            failure.cookies
                .getAll()
                .some((c) => c.name.startsWith('onepiece-auth') && c.value),
            false,
        );
        const guest = await GET(req(undefined, cookieJar(failure)));
        assert.equal((await guest.json()).registered, false);
        assert.equal(calls, 1);
    } finally {
        globalThis.fetch = original;
        restore();
    }
});
test('verified password login survives a server restart, refreshes cookies and logs out without using a local Vercel DB', async () => {
    const restore = environment(),
        original = globalThis.fetch;
    const called: string[] = [];
    try {
        globalThis.fetch = async (input, init) => {
            const url = String(input);
            called.push(url);
            if (url.endsWith('/token?grant_type=password'))
                return Response.json({
                    access_token: jwt(),
                    refresh_token: 'unit-refresh',
                    expires_in: 3600,
                    token_type: 'bearer',
                    user,
                });
            if (url.endsWith('/token?grant_type=refresh_token'))
                return Response.json({
                    access_token: jwt(),
                    refresh_token: 'unit-refreshed',
                    expires_in: 3600,
                    token_type: 'bearer',
                    user,
                });
            if (url.endsWith('/user')) {
                assert.ok(
                    new Headers(init?.headers)
                        .get('Authorization')
                        ?.startsWith('Bearer '),
                );
                return Response.json(user);
            }
            if (url.includes('/logout'))
                return new Response(null, { status: 204 });
            throw new Error('Unexpected provider endpoint');
        };
        const guest = await GET(req());
        const oldCookie = cookieJar(guest);
        const login = await POST(
            req(
                {
                    action: 'login',
                    email: 'tester@example.test',
                    password: 'unit-password',
                },
                oldCookie,
            ),
        );
        assert.equal(login.status, 200);
        const payload = await login.json();
        assert.deepEqual(payload, { saved: true });
        const authCookies = login.cookies
            .getAll()
            .filter((c) => c.name.startsWith('onepiece-auth') && c.value);
        assert.ok(authCookies.length);
        for (const c of authCookies) {
            assert.equal(c.httpOnly, true);
            assert.equal(c.secure, true);
            assert.equal(c.sameSite, 'lax');
        }
        assert.match(login.headers.get('Cache-Control')!, /private.*no-store/);
        const cookie = cookieJar(login);
        globalThis.onepieceSessions = undefined;
        const restarted = await GET(req(undefined, cookie));
        assert.equal(restarted.status, 200);
        const data = await restarted.json();
        assert.equal(data.registered, true);
        assert.deepEqual(data.member, {
            name: 'Test member',
            provider: 'email',
        });
        assert.equal(data.cartPersistence, 'browser');
        assert.equal(data.tossConfigured, false);
        assert.equal(globalThis.onepieceDb, undefined);
        assert.ok(called.some((u) => u.endsWith('/user')));
        const forged = await GET(
            req(
                undefined,
                'onepiece-auth=' +
                    encodeURIComponent(
                        JSON.stringify({ user: { id: userId } }),
                    ),
            ),
        );
        assert.equal((await forged.json()).registered, false);
        const expired =
            'onepiece-auth=base64-' +
            Buffer.from(
                JSON.stringify({
                    access_token: jwt(-30),
                    refresh_token: 'unit-refresh',
                    expires_at: Math.floor(Date.now() / 1000) - 30,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user,
                }),
            ).toString('base64url');
        const refreshed = await GET(req(undefined, expired));
        assert.equal((await refreshed.json()).registered, true);
        assert.ok(called.some((u) => u.includes('grant_type=refresh_token')));
        assert.ok(
            refreshed.cookies
                .getAll()
                .some((c) => c.name.startsWith('onepiece-auth') && c.value),
        );
        const logout = await POST(req({ action: 'logout' }, cookie));
        assert.equal(logout.status, 200);
        assert.ok(
            logout.cookies
                .getAll()
                .some(
                    (c) => c.name.startsWith('onepiece-auth') && c.maxAge === 0,
                ),
        );
        const after = await GET(req(undefined, cookieJar(logout)));
        assert.equal((await after.json()).registered, false);
        assert.equal((await GET(req(undefined, oldCookie))).status, 200);
        assert.ok(
            called.every((u) =>
                u.startsWith('https://auth-unit.supabase.co/auth/v1/'),
            ),
        ); // No signup, Gmail/OAuth or mail request.
    } finally {
        globalThis.fetch = original;
        restore();
    }
});
