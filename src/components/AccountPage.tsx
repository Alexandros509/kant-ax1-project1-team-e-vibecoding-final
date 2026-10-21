'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useShop, shopPost } from './ShopRuntime';
import useCounterStore from '@/shared/store/useCounterStore';
import useAppFlow from '@/shared/hooks/useAppFlow';
import styles from './AccountPage.module.scss';

export default function AccountPage({ join = false }: { join?: boolean }) {
    const params = useSearchParams(),
        router = useRouter(),
        surface = useAppFlow();
    const { session, refresh } = useShop();
    const [name, setName] = useState<string | null>(null),
        [message, setMessage] = useState(''),
        [busy, setBusy] = useState(false);
    const member = session?.member;

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
            await refresh();
            router.replace('/login');
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    }
    const kakaoArtwork = (
        <Image
            src="/auth/kakao/kakao_login_en_large.svg"
            width={336}
            height={46}
            alt=""
            unoptimized
            className={styles.kakaoArtwork}
        />
    );
    const kakaoHref =
        '/api/auth/kakao?returnTo=' +
        encodeURIComponent(surface === 'web' ? '/join' : '/app-preview');
    return (
        <main className={styles.page}>
            <div className={styles.brand}>OnePiece</div>
            <section className={styles.form}>
                <h1>
                    {member
                        ? join
                            ? 'Profile'
                            : 'My account'
                        : join
                          ? 'Join'
                          : 'Log in'}
                </h1>
                <p className={styles.muted}>
                    {member
                        ? `Welcome, ${member.name}.`
                        : 'Your next piece starts here.'}
                </p>
                {!session ? (
                    <p role="status">Loading…</p>
                ) : member ? (
                    <form onSubmit={save}>
                        <label>
                            Name / Nickname
                            <input
                                value={name ?? member.name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                maxLength={50}
                                required
                                autoComplete="nickname"
                            />
                        </label>
                        <button className={styles.primary} disabled={busy}>
                            Save profile
                        </button>
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
                    </form>
                ) : (
                    <>
                        {session?.kakaoConfigured ? (
                            <a
                                data-track-action="kakao_login"
                                aria-label="Login with Kakao"
                                className={styles.kakaoButton}
                                href={kakaoHref}
                                target={surface === 'web' ? undefined : '_top'}
                            >
                                {kakaoArtwork}
                            </a>
                        ) : (
                            <button
                                type="button"
                                className={styles.kakaoButton}
                                aria-label="Login with Kakao"
                                aria-describedby="kakao-login-unavailable"
                                disabled
                            >
                                {kakaoArtwork}
                            </button>
                        )}
                        {!session?.kakaoConfigured && (
                            <p
                                id="kakao-login-unavailable"
                                className={styles.providerNote}
                            >
                                Kakao sign-in is currently unavailable. Please
                                try again later.
                            </p>
                        )}
                        <p className={styles.membershipNote}>
                            Your first Kakao sign-in creates a OnePiece account.
                        </p>
                        <Link
                            data-track-action="join_open"
                            className={styles.textButton}
                            href={join ? '/login' : '/join'}
                        >
                            {join
                                ? 'Already a member? Log in'
                                : 'New to OnePiece? Join'}
                        </Link>
                    </>
                )}
                {params.has('error') && (
                    <p role="alert" className={styles.notice}>
                        We could not complete your sign-in. Please check the
                        sign-in setup and try again.
                    </p>
                )}
                {message && (
                    <p role="status" className={styles.notice}>
                        {message}
                    </p>
                )}
            </section>
            <p className={styles.foot}>ONEPIECE · Demo store</p>
        </main>
    );
}
