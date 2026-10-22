import { NextRequest, NextResponse } from 'next/server';
import {
    catalog,
    createSession,
    findSession,
    recordEvent,
    syncCart,
    savedCart,
    changeConsent,
    removeSession,
    collections,
    updateCollection,
    receipt,
} from '@/lib/shop-server';
import {
    member,
    providerConfig,
    linkVerifiedMember,
    updateMember,
    prepareToss,
    confirmToss,
    refreshToss,
} from '@/lib/providers';
import {
    authRequest,
    passwordSignIn,
    verifiedMember,
} from '@/lib/supabase-auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieName = 'onepiece-public-erd13-session';
type AuthRequest = ReturnType<typeof authRequest>;
async function requestSession(req: NextRequest, auth: AuthRequest) {
    let s = await findSession(req.cookies.get(cookieName)?.value),
        token: string | undefined;
    const user = await auth.user();
    if (s?.user_id && s.user_id !== user?.id) {
        removeSession(s);
        s = null;
    }
    if (!s) {
        const fresh = await createSession();
        s = fresh.session;
        token = fresh.token;
    }
    if (user && s.user_id !== user.id) {
        const verified = await linkVerifiedMember(s, verifiedMember(user));
        s = verified.session;
        token = verified.token;
    }
    return { session: s, token };
}
function respond(
    auth: AuthRequest,
    req: NextRequest,
    data: object,
    token?: string,
    status = 200,
) {
    const response = NextResponse.json(data, { status });
    if (token)
        response.cookies.set(cookieName, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: req.nextUrl.protocol === 'https:',
            maxAge: 30 * 86400,
            path: '/',
        });
    return auth.apply(response);
}
export async function GET(req: NextRequest) {
    const auth = authRequest(req);
    try {
        const action = req.nextUrl.searchParams.get('action');
        if (action === 'catalog')
            return NextResponse.json({ products: await catalog() });
        const { session: s, token } = await requestSession(req, auth);
        let data: object;
        if (action === 'receipt') {
            if (!s.user_id)
                return respond(
                    auth,
                    req,
                    { error: 'Please log in.' },
                    token,
                    401,
                );
            if (process.env.VERCEL === '1')
                return respond(
                    auth,
                    req,
                    { error: 'Orders require the member database connection.' },
                    token,
                    503,
                );
            data = {
                order: await receipt(s, req.nextUrl.searchParams.get('number')),
            };
        } else if (action === 'collections') data = await collections(s);
        else
            data = {
                variant: 'B',
                experimentEnabled: false,
                experimentId: '',
                consent: s.consent,
                registered: !!s.user_id,
                snapshotId: s.snapshot_id,
                gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
                ...providerConfig(),
                member: await member(s),
                cartPersistence:
                    process.env.VERCEL === '1' ? 'browser' : 'database',
                ...(process.env.VERCEL === '1'
                    ? {}
                    : { cart: await savedCart(s) }),
                profileEditable: process.env.VERCEL !== '1',
            };
        return respond(auth, req, data, token);
    } catch {
        return respond(
            auth,
            req,
            { error: 'We could not load your session. Please try again.' },
            undefined,
            503,
        );
    }
}
const buckets = new Map<string, { at: number; n: number }>();
const loginBuckets = new Map<string, { at: number; n: number }>();
function withinLimit(
    store: typeof buckets,
    key: string,
    limit: number,
    period: number,
) {
    const now = Date.now();
    for (const [id, row] of store) if (now - row.at > period) store.delete(id);
    const row = store.get(key) || { at: now, n: 0 };
    row.n++;
    store.set(key, row);
    return row.n <= limit;
}
export function sameOrigin(req: NextRequest) {
    try {
        const expected = new URL(process.env.APP_ORIGIN || req.nextUrl.origin);
        if (
            expected.username ||
            expected.password ||
            expected.pathname !== '/' ||
            expected.search ||
            expected.hash
        )
            return false;
        return (
            req.headers.get('x-shop-request') === '1' &&
            (!req.headers.get('origin') ||
                req.headers.get('origin') === expected.origin)
        );
    } catch {
        return false;
    }
}
export async function POST(req: NextRequest) {
    const auth = authRequest(req);
    let token: string | undefined;
    try {
        if (!sameOrigin(req))
            return respond(
                auth,
                req,
                { error: 'Invalid request.' },
                undefined,
                403,
            );
        const resolved = await requestSession(req, auth);
        const s = resolved.session;
        token = resolved.token;
        if (!withinLimit(buckets, s.token_hash, 120, 60000))
            return respond(
                auth,
                req,
                { error: 'Please try again shortly.' },
                token,
                429,
            );
        const raw = await req.text();
        if (raw.length > 30000) throw new Error('The request is too large.');
        const body = JSON.parse(raw);
        if (!body || Array.isArray(body) || typeof body !== 'object')
            throw new Error('Invalid request.');
        let data: object;
        switch (body.action) {
            case 'login': {
                // In-memory throttle supplements the Auth project's own rate limits; it is not a shared production limiter.
                const ip =
                    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    'local';
                if (!withinLimit(loginBuckets, ip, 10, 60000))
                    return respond(
                        auth,
                        req,
                        {
                            error: 'Too many sign-in attempts. Please wait a minute.',
                        },
                        token,
                        429,
                    );
                if (s.user_id)
                    throw new Error(
                        'Please log out before using another account.',
                    );
                const user = await passwordSignIn(auth.client, body);
                const verified = await linkVerifiedMember(
                    s,
                    verifiedMember(user),
                );
                token = verified.token;
                data = { saved: true };
                break;
            }
            case 'logout': {
                await auth.logout();
                removeSession(s);
                const fresh = await createSession();
                token = fresh.token;
                data = { saved: true };
                break;
            }
            case 'profile':
                data = await updateMember(s, body);
                break;
            case 'toss-prepare':
                data = await prepareToss(s, body);
                break;
            case 'toss-confirm':
                data = await confirmToss(s, body);
                break;
            case 'toss-status':
                data = await refreshToss(s, body);
                break;
            case 'consent':
                data = changeConsent(s, body.consent === true);
                break;
            case 'cart':
                data = await syncCart(s, body.items);
                break;
            case 'favorite':
            case 'recent-view':
                data = await updateCollection(s, body);
                break;
            case 'event':
                data = await recordEvent(s, body);
                break;
            default:
                return respond(
                    auth,
                    req,
                    { error: 'Unsupported action.' },
                    token,
                    410,
                );
        }
        return respond(auth, req, data, token);
    } catch (error) {
        return respond(
            auth,
            req,
            {
                error:
                    error instanceof Error ? error.message : 'Request failed.',
            },
            token,
            400,
        );
    }
}
