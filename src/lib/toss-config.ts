type Environment = Record<string, string | undefined>;
export function tossConfiguration(env: Environment = process.env) {
    const issues: string[] = [];
    const client = env.TOSS_CLIENT_KEY?.trim() || '';
    const secret = env.TOSS_SECRET_KEY?.trim() || '';
    if (!client) issues.push('TOSS_CLIENT_KEY is missing.');
    else if (!/^test_ck_[A-Za-z0-9_-]+$/.test(client))
        issues.push(
            'TOSS_CLIENT_KEY must be an individual payment-window test_ck_ key.',
        );
    if (!secret) issues.push('TOSS_SECRET_KEY is missing.');
    else if (!/^test_sk_[A-Za-z0-9_-]+$/.test(secret))
        issues.push('TOSS_SECRET_KEY must be the matching test_sk_ key.');
    const origin = env.APP_ORIGIN || 'http://127.0.0.1:3019';
    try {
        const url = new URL(origin);
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(
            url.hostname,
        );
        if (
            url.origin !== origin ||
            (!local && url.protocol !== 'https:') ||
            !['http:', 'https:'].includes(url.protocol)
        )
            throw new Error();
    } catch {
        issues.push(
            'APP_ORIGIN must be the exact site origin, without a trailing slash; use HTTPS except on loopback.',
        );
    }
    return { configured: issues.length === 0, issues, origin };
}
export function tossTestKeys() {
    const config = tossConfiguration();
    if (!config.configured)
        throw new Error('Test payments are currently unavailable.');
    return {
        clientKey: process.env.TOSS_CLIENT_KEY!.trim(),
        secretKey: process.env.TOSS_SECRET_KEY!.trim(),
        origin: config.origin,
    };
}
