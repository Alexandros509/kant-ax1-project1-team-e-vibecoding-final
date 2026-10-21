'use client';

import { useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useShop } from '@/components/ShopRuntime';
import styles from './CampaignHero.module.scss';

export function CampaignHero() {
    const { raw, track, loading, error } = useShop();
    const jacket = raw.find(p => p.sourceUrl === '/demo/demo-01-ink');
    const pants = raw.find(p => p.sourceUrl === '/demo/demo-09-ink');
    const [outfitOpen, setOutfitOpen] = useState(true);
    const outfitTrigger = useRef<HTMLButtonElement>(null);
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
                <Image className={styles.media} src="/demo/campaign.svg"
                    alt="Original geometric illustration of a jacket and trousers" fill preload sizes="100vw" />
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
                href={`/products/${jacket.id}`} aria-label="View demo Studio Jacket" onClick={() => void track('select_item', jacket.id)}>
                <span className={styles.caption}>Shop a similar jacket ↗</span>
            </Link>}
            {pants && <Link className={`${styles.hotspot} ${styles.pants}`} data-track-action="open_product" data-track-item-id={pants.id}
                href={`/products/${pants.id}`} aria-label="View demo Wide Trousers" onClick={() => void track('select_item', pants.id)}>
                <span className={styles.caption}>Shop similar pants ↗</span>
            </Link>}
            <span className={styles.lookNote}>FICTIONAL STORE · TEST PAYMENTS ONLY</span>
            <section className={styles.discovery} aria-labelledby="brand-title">
                <h1 id="brand-title">OnePiece</h1>
                <div className={styles.sloganBox}><p className={styles.slogan}>A STUDY IN EVERYDAY FORM.</p></div>
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
