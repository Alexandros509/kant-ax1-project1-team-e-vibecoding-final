'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop, shopPost, basketPayload } from './ShopRuntime';
import useCounterStore from '@/shared/store/useCounterStore';
import styles from './AccountPage.module.scss';

export default function AccountPage({ join = false }: { join?: boolean }) {
    const router = useRouter();
    const { session, refresh, error } = useShop();
    const [name, setName] = useState<string | null>(null),
        [email, setEmail] = useState(''),
        [password, setPassword] = useState(''),
        [visible, setVisible] = useState(false),
        [message, setMessage] = useState(''),
        [busy, setBusy] = useState(false);
    const member = session?.member;
    async function login(event: React.FormEvent) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setMessage('');
        try {
            // Sync the current guest bag before rotating the authenticated session.
            await shopPost('cart', { items: basketPayload() });
            await shopPost('login', { email, password });
            setPassword('');
            await refresh();
            router.replace('/');
            router.refresh();
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    }
    async function save(event: React.FormEvent) {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            await shopPost('profile', { name: name ?? member?.name });
            await refresh();
            setMessage('Your profile has been saved.');
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    }
    async function logout() {
        setBusy(true);
        setMessage('');
        try {
            await shopPost('logout');
            useCounterStore.getState().setCartItems(() => []);
            localStorage.removeItem('erd13-media-v3-onepiece-pending-order');
            setPassword('');
            await refresh();
            router.replace('/login');
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <main className={styles.page}>
            <div className={styles.brand}>OnePiece</div>
            <section className={styles.form} aria-labelledby="account-heading">
                <h1 id="account-heading">{member ? 'My account' : 'Log in'}</h1>
                <p className={styles.muted}>
                    {member
                        ? 'Welcome back, ' + member.name + '.'
                        : 'Your next piece starts here.'}
                </p>
                {!session ? (
                    <p role="status">
                        {error
                            ? 'We could not load sign-in. Please refresh and try again.'
                            : 'Loading…'}
                    </p>
                ) : member ? (
                    <>
                        {session.profileEditable ? (
                            <form onSubmit={save}>
                                <label>
                                    Name / Nickname
                                    <input
                                        value={name ?? member.name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                        maxLength={50}
                                        required
                                        autoComplete="nickname"
                                    />
                                </label>
                                <button
                                    className={styles.primary}
                                    disabled={busy}
                                >
                                    Save profile
                                </button>
                            </form>
                        ) : null}
                        <Link className={styles.secondary} href="/">
                            Continue shopping
                        </Link>
                        <Link
                            className={styles.secondary}
                            data-track-action="checkout_open"
                            href="/checkout"
                        >
                            Continue to checkout
                        </Link>
                        <button
                            type="button"
                            className={styles.textButton}
                            disabled={busy}
                            onClick={() => void logout()}
                        >
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        {join ? (
                            <p className={styles.membershipNote}>
                                Your test account has already been created. Log
                                in with the account details provided to you.
                            </p>
                        ) : null}
                        <form onSubmit={login} aria-busy={busy}>
                            <label htmlFor="login-email">
                                Email
                                <input
                                    id="login-email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    autoComplete="username"
                                    inputMode="email"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    maxLength={254}
                                    required
                                    disabled={busy}
                                />
                            </label>
                            <label htmlFor="login-password">
                                Password
                                <span className={styles.passwordField}>
                                    <input
                                        id="login-password"
                                        name="password"
                                        type={visible ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        maxLength={1024}
                                        required
                                        disabled={busy}
                                        aria-describedby={
                                            message
                                                ? 'login-message'
                                                : undefined
                                        }
                                    />
                                    <button
                                        className={styles.passwordToggle}
                                        type="button"
                                        aria-label={
                                            visible
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                        aria-pressed={visible}
                                        onClick={() => setVisible(!visible)}
                                    >
                                        {visible ? 'Hide' : 'Show'}
                                    </button>
                                </span>
                            </label>
                            <button
                                type="submit"
                                data-track-action="login_submit"
                                className={styles.primary}
                                disabled={busy || !session.emailLoginConfigured}
                            >
                                {busy ? 'Logging in…' : 'Log in'}
                            </button>
                        </form>
                        {!session.emailLoginConfigured ? (
                            <p className={styles.providerNote} role="status">
                                Sign-in is currently unavailable. Please try
                                again later.
                            </p>
                        ) : null}
                        <p className={styles.membershipNote}>
                            Use your OnePiece account email and password.
                        </p>
                    </>
                )}
                {message ? (
                    <p
                        id="login-message"
                        role="alert"
                        className={styles.notice}
                    >
                        {message}
                    </p>
                ) : null}
            </section>
            <p className={styles.foot}>
                ONEPIECE
            </p>
        </main>
    );
}
