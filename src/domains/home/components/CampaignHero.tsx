'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useShop } from '@/components/ShopRuntime';
import styles from './CampaignHero.module.scss';

const VIDEO_SRC = '/campaign/campaign-video.mp4';
const POSTER_SRC = '/campaign/campaign-poster.jpg';
const LOGO_SRC = '/campaign/onepiece-logo.svg';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
}

function getCanPlayVideo() {
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    return !window.matchMedia(REDUCED_MOTION_QUERY).matches && !saveData;
}

function getServerCanPlayVideo() {
    return false;
}

export function CampaignHero() {
    const { raw, track, loading, error } = useShop();
    const jacket = raw.find(p => p.available && p.images.some(url => url.endsWith('/outerJacketBlack.png'))) || raw.find(p => p.images.some(url => url.endsWith('/outerJacketBlack.png')));
    const pants = raw.find(p => p.available && p.images.some(url => url.endsWith('/bottomPantsBlack.png'))) || raw.find(p => p.images.some(url => url.endsWith('/bottomPantsBlack.png')));
    const [outfitOpen, setOutfitOpen] = useState(true);
    const outfitTrigger = useRef<HTMLButtonElement>(null);
    const [videoFailed, setVideoFailed] = useState(false);
    const [manualPlayback, setManualPlayback] = useState(false);
    const [playbackBlocked, setPlaybackBlocked] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canPlayVideo = useSyncExternalStore(subscribeReducedMotion, getCanPlayVideo, getServerCanPlayVideo);
    const showVideo = (canPlayVideo || manualPlayback) && !videoFailed;

    useEffect(() => {
        const video = videoRef.current;
        if (!showVideo || !video) return;
        let live = true;
        const resume = () => {
            if (document.visibilityState === 'hidden' || !video.paused) return;
            video.muted = true;
            void video.play().then(() => { if (live) setPlaybackBlocked(false); })
                .catch(() => { if (live) setPlaybackBlocked(true); });
        };
        video.addEventListener('canplay', resume);
        video.addEventListener('loadeddata', resume);
        document.addEventListener('visibilitychange', resume);
        document.addEventListener('pointerdown', resume, { passive: true });
        window.addEventListener('pageshow', resume);
        resume();
        return () => {
            live = false;
            video.removeEventListener('canplay', resume);
            video.removeEventListener('loadeddata', resume);
            document.removeEventListener('visibilitychange', resume);
            document.removeEventListener('pointerdown', resume);
            window.removeEventListener('pageshow', resume);
        };
    }, [showVideo]);

    function startVideo() {
        setManualPlayback(true);
        setVideoFailed(false);
        const video = videoRef.current;
        if (video) void video.play().then(() => setPlaybackBlocked(false)).catch(() => setPlaybackBlocked(true));
    }

    function openOutfit() {
        setOutfitOpen(true);
    }

    function closeOutfit() {
        setOutfitOpen(false);
        outfitTrigger.current?.focus({ preventScroll: true });
    }

    function handlePointerMove(event: PointerEvent<HTMLElement>) {
        const { left, top } = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--x', `${event.clientX - left}px`);
        event.currentTarget.style.setProperty('--y', `${event.clientY - top}px`);
    }

    return (
        <main className={styles.campaign} aria-label="ONEPIECE campaign" onPointerMove={handlePointerMove}
            onKeyDown={event => { if (event.key === 'Escape' && outfitOpen) closeOutfit(); }}>
            <div className={styles.mediaFrame}>
                {/* Keep the existing campaign media; the mobile viewport crops around the model. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.media} src={POSTER_SRC}
                    alt="ONEPIECE campaign model wearing a black outfit by the riverside" fetchPriority="high" />
                {showVideo && <video ref={videoRef} preload="auto" className={styles.media}
                    src={VIDEO_SRC} poster={POSTER_SRC} autoPlay muted loop playsInline aria-hidden="true" tabIndex={-1}
                    onPlaying={() => setPlaybackBlocked(false)}
                    onPause={() => { if (document.visibilityState === 'visible') setPlaybackBlocked(true); }}
                    onError={() => setVideoFailed(true)} />}
                {(!showVideo || playbackBlocked) && <button type="button" className={styles.playVideo} onClick={startVideo}>Play video ↗</button>}
                <div className={styles.shade} aria-hidden="true" />

                <div className={styles.mobileLook}>
                    {jacket && <Link className={`${styles.pieceMarker} ${styles.jacketMarker}`} href={`/products/${jacket.id}`} prefetch={false}
                        aria-label="View jacket details" data-track-action="open_product" data-track-item-id={jacket.id}
                        onClick={() => void track('select_item', jacket.id)}>
                        <span aria-hidden="true">+</span> JACKET
                    </Link>}
                    {pants && <Link className={`${styles.pieceMarker} ${styles.pantsMarker}`} href={`/products/${pants.id}`} prefetch={false}
                        aria-label="View pants details" data-track-action="open_product" data-track-item-id={pants.id}
                        onClick={() => void track('select_item', pants.id)}>
                        <span aria-hidden="true">+</span> PANTS
                    </Link>}
                    <button ref={outfitTrigger} type="button" className={styles.outfitTrigger} aria-expanded={outfitOpen}
                        aria-controls="look-products-sheet" data-track-action="outfit_open" onClick={() => openOutfit()}>
                        VIEW OUTFIT <span aria-hidden="true">↗</span>
                    </button>
                </div>
            </div>

            {/* Desktop keeps its original composition and direct garment links. */}
            {jacket && <Link className={`${styles.hotspot} ${styles.jacket}`} data-track-action="open_product" data-track-item-id={jacket.id}
                href={`/products/${jacket.id}`} aria-label="View a similar ONEPIECE jacket" onClick={() => void track('select_item', jacket.id)}>
                <span className={styles.caption}>Shop a similar jacket ↗</span>
            </Link>}
            {pants && <Link className={`${styles.hotspot} ${styles.pants}`} data-track-action="open_product" data-track-item-id={pants.id}
                href={`/products/${pants.id}`} aria-label="View similar ONEPIECE pants" onClick={() => void track('select_item', pants.id)}>
                <span className={styles.caption}>Shop similar pants ↗</span>
            </Link>}
            <span className={styles.lookNote}>SHOP THE LOOK · SIMILAR ITEMS</span>
            <section className={styles.discovery} aria-labelledby="brand-title">
                <h1 id="brand-title"><Image className={styles.logo} src={LOGO_SRC} alt="OnePiece" width={1302} height={287} preload /></h1>
                <div className={styles.sloganBox}><p className={styles.slogan}>ONEPIECE IS MASTER-PIECE.</p></div>
            </section>
            <div className={styles.crosslines} aria-hidden="true"><div className={styles.horizontal} /><div className={styles.vertical} /></div>

            {outfitOpen && <section id="look-products-sheet" className={styles.outfitSheet} aria-labelledby="look-products-title">
                <div className={styles.sheetHandle} aria-hidden="true" />
                <div className={styles.sheetHeading}>
                    <div><h2 id="look-products-title">Shop the look</h2><p>SIMILAR ITEMS</p></div>
                    <button type="button" className={styles.closeSheet} aria-label="Close outfit items"
                        data-track-action="outfit_close" onClick={closeOutfit}><span aria-hidden="true">×</span></button>
                </div>
                <div className={styles.outfitProducts}>
                    {[{ piece: 'jacket', product: jacket }, { piece: 'pants', product: pants }].map(({ piece, product }) => product &&
                        <Link key={piece} href={`/products/${product.id}`} prefetch={false}
                            className={styles.outfitProduct}
                            data-track-action="open_product" data-track-item-id={product.id}
                            onClick={() => void track('select_item', product.id)}>
                            <span className={styles.productThumb}>{product.images[0] && <Image unoptimized src={product.images[0]} alt="" width={64} height={76} />}</span>
                            <span className={styles.productCopy}><strong>{product.name}</strong><span>{product.color}{!product.available ? ' · SOLD OUT' : ''}</span></span>
                            <span className={styles.productArrow} aria-hidden="true">›</span>
                        </Link>
                    )}
                    {!jacket && !pants && <p className={styles.emptyOutfit} role="status">
                        {loading && !error ? 'Loading outfit…' : 'Outfit items are temporarily unavailable.'}
                    </p>}
                </div>
            </section>}
        </main>
    );
}
