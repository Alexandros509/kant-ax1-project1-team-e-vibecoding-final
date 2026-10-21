import { NextRequest, NextResponse } from 'next/server';
import { catalog, createSession, findSession, recordEvent, syncCart, savedCart, changeConsent, removeSession, collections, updateCollection, receipt } from '@/lib/shop-server';
import { member, providerConfig, updateMember, prepareToss, confirmToss, refreshToss } from '@/lib/providers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const cookieName = 'onepiece-public-erd13-session';
export async function GET(req: NextRequest) {
    try {
        const action = req.nextUrl.searchParams.get('action');
        if (action === 'catalog') return NextResponse.json({products: await catalog()});
        let s = await findSession(req.cookies.get(cookieName)?.value), token: string | undefined;
        if (!s) { const created = await createSession(); s = created.session; token = created.token; }
        let data: object;
        if (action === 'receipt') {
            if (!s.user_id) return NextResponse.json({error: 'Please log in.'}, {status: 401});
            data = {order: await receipt(s, req.nextUrl.searchParams.get('number'))};
        } else if (action === 'collections') data = await collections(s);
        else data = {variant: 'B', experimentEnabled: false, experimentId: '', consent: s.consent, registered: !!s.user_id, snapshotId: s.snapshot_id, gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', ...providerConfig(), member: await member(s), cart: await savedCart(s)};
        const response = NextResponse.json(data, {headers: {'Cache-Control': 'no-store'}});
        if (token) response.cookies.set(cookieName, token, {httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', maxAge: 30 * 86400, path: '/'});
        return response;
    } catch (error) { console.error('shop GET failed', error); return NextResponse.json({error: 'We could not load your data.'}, {status: 500}); }
}
const buckets = new Map<string, {at: number; n: number}>();
export async function POST(req: NextRequest) {
    try {
        const origin = req.headers.get('origin'), expected = process.env.APP_ORIGIN || `${req.nextUrl.protocol}//${req.headers.get('host')}`;
        if (req.headers.get('x-shop-request') !== '1' || (origin && origin !== expected)) return NextResponse.json({error: 'This request is not allowed.'}, {status: 403});
        const s = await findSession(req.cookies.get(cookieName)?.value);
        if (!s) return NextResponse.json({error: 'Please refresh this page.'}, {status: 401});
        const now = Date.now(); for (const [key, value] of buckets) if (now - value.at > 60000) buckets.delete(key);
        const bucket = buckets.get(s.token_hash) || {at: now, n: 0}; bucket.n++; buckets.set(s.token_hash, bucket);
        if (bucket.n > 120) return NextResponse.json({error: 'Please try again shortly.'}, {status: 429});
        const raw = await req.text(); if (raw.length > 30000) throw new Error('The request is too large.'); const body = JSON.parse(raw);
        switch (body.action) {
            case 'profile': return NextResponse.json(await updateMember(s, body));
            case 'toss-prepare': return NextResponse.json(await prepareToss(s, body));
            case 'toss-confirm': return NextResponse.json(await confirmToss(s, body));
            case 'toss-status': return NextResponse.json(await refreshToss(s, body));
            case 'consent': return NextResponse.json(changeConsent(s, body.consent === true));
            case 'cart': return NextResponse.json(await syncCart(s, body.items));
            case 'favorite': case 'recent-view': return NextResponse.json(await updateCollection(s, body));
            case 'event': return NextResponse.json(await recordEvent(s, body));
            case 'logout': {
                removeSession(s); const fresh = await createSession(); const response = NextResponse.json({saved: true});
                response.cookies.set(cookieName, fresh.token, {httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', maxAge: 30 * 86400, path: '/'}); return response;
            }
            default: return NextResponse.json({error: 'Unsupported action.'}, {status: 410});
        }
    } catch (error) { return NextResponse.json({error: error instanceof Error ? error.message : 'Request failed.'}, {status: 400}); }
}
