import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { NextRequest, NextResponse } from 'next/server';

const cookiePrefix = 'onepiece-auth';
export function supabaseAuthConfig() {
    const value = process.env.ONEPIECE_SUPABASE_URL?.trim();
    const key = (
        process.env.ONEPIECE_SUPABASE_PUBLISHABLE_KEY || process.env.ONEPIECE_SUPABASE_ANON_KEY
    )?.trim();
    if (!value || !key) return null;
    try {
        const url = new URL(value);
        if (
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            url.pathname !== '/' ||
            !(
                url.protocol === 'https:' ||
                (url.protocol === 'http:' &&
                    ['localhost', '127.0.0.1'].includes(url.hostname))
            )
        )
            return null;
        // Elevated project keys are never needed for an existing user's password login.
        if (!key.startsWith('sb_publishable_')) {
            const claims = JSON.parse(
                Buffer.from(key.split('.')[1] || '', 'base64url').toString(),
            );
            if (claims.role !== 'anon') return null;
        }
        return { url: url.origin, key };
    } catch {
        return null;
    }
}
export function authRequest(req: NextRequest) {
    const config = supabaseAuthConfig();
    const changes = new Map<
        string,
        { name: string; value: string; options: CookieOptions }
    >();
    const current = new Map(req.cookies.getAll().map((c) => [c.name, c.value]));
    const secure = req.nextUrl.protocol === 'https:';
    const client = config
        ? createServerClient(config.url, config.key, {
              cookieOptions: {
                  name: cookiePrefix,
                  httpOnly: true,
                  sameSite: 'lax',
                  secure,
                  path: '/',
                  maxAge: 30 * 86400,
              },
              global: {
                  fetch: (input, init) =>
                      fetch(input, {
                          ...init,
                          signal: AbortSignal.timeout(15000),
                      }),
              },
              cookies: {
                  getAll: () =>
                      [...current].map(([name, value]) => ({ name, value })),
                  setAll: (cookies) => {
                      for (const c of cookies) {
                          changes.set(c.name, c);
                          current.set(c.name, c.value);
                      }
                  },
              },
          })
        : null;
    const clear = () => {
        for (const name of current.keys())
            if (name === cookiePrefix || name.startsWith(cookiePrefix + '.'))
                changes.set(name, {
                    name,
                    value: '',
                    options: { maxAge: 0, path: '/' },
                });
    };
    return {
        client,
        async user(): Promise<User | null> {
            if (!client) return null;
            if (
                ![...current.keys()].some(
                    (name) =>
                        name === cookiePrefix ||
                        name.startsWith(cookiePrefix + '.'),
                )
            )
                return null;
            // getUser verifies the token with Auth; an unverified cookie/user UUID cannot authorize a member.
            const { data, error } = await client.auth.getUser();
            if (error) {
                if (!error.status || error.status >= 500)
                    throw new Error(
                        'Sign-in is temporarily unavailable. Please try again.',
                    );
                clear();
                return null;
            }
            return data.user;
        },
        async logout() {
            if (client) {
                const { error } = await client.auth.signOut({ scope: 'local' });
                if (error)
                    throw new Error(
                        'We could not complete your logout. Please try again.',
                    );
            }
            clear();
        },
        apply(response: NextResponse) {
            response.headers.set(
                'Cache-Control',
                'private, no-store, max-age=0',
            );
            response.headers.set('Pragma', 'no-cache');
            response.headers.set('Expires', '0');
            for (const c of changes.values())
                response.cookies.set(c.name, c.value, {
                    ...c.options,
                    httpOnly: true,
                    sameSite: 'lax',
                    secure,
                    path: '/',
                });
            return response;
        },
    };
}
export async function passwordSignIn(
    client: SupabaseClient | null,
    body: Record<string, unknown>,
) {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
        email.length > 254 ||
        !/^\S+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !password ||
        password.length > 1024
    )
        throw new Error('Enter a valid email and password.');
    if (!client)
        throw new Error(
            'Sign-in is currently unavailable. Please try again later.',
        );
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
    });
    // Do not disclose whether an email is registered or forward provider diagnostics.
    if (error || !data.user || !data.session)
        throw new Error(
            'We could not log you in. Check your email and password, or contact your test coordinator.',
        );
    return data.user;
}
export const verifiedMember = (user: User) => ({
    id: user.id,
    name:
        typeof user.user_metadata?.display_name === 'string'
            ? user.user_metadata.display_name.slice(0, 50)
            : 'ONEPIECE member',
});
