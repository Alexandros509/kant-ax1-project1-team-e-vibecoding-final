'use client';

import { useEffect, useRef, useState, type TouchEvent } from 'react';
import styles from './ProductGallery.module.scss';

type GalleryImage = { id: number | string; url: string; seq?: number | null };

export default function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
    const [selected, setSelected] = useState(0);
    const rail = useRef<HTMLDivElement>(null);
    const touchStart = useRef<{ x: number; y: number } | null>(null);
    const index = Math.min(selected, Math.max(0, images.length - 1));

    function move(direction: number) {
        setSelected((current) => (current + direction + images.length) % images.length);
    }

    useEffect(() => {
        const container = rail.current;
        const thumbnail = container?.children[index] as HTMLElement | undefined;
        if (!container || !thumbnail) return;
        const left = thumbnail.offsetLeft - container.offsetLeft;
        if (left < container.scrollLeft || left + thumbnail.offsetWidth > container.scrollLeft + container.clientWidth) {
            container.scrollTo({ left: left - (container.clientWidth - thumbnail.offsetWidth) / 2, behavior: 'smooth' });
        }
    }, [index]);

    function endSwipe(event: TouchEvent) {
        const start = touchStart.current;
        touchStart.current = null;
        const touch = event.changedTouches[0];
        if (!start || !touch || images.length < 2) return;
        const x = touch.clientX - start.x;
        const y = touch.clientY - start.y;
        if (Math.abs(x) > 45 && Math.abs(x) > Math.abs(y) * 1.4) move(x < 0 ? 1 : -1);
    }

    if (!images.length) return <div className={styles.empty}>No images available.</div>;

    return <section className={styles.gallery} aria-label={`${name} product images`}>
        <div className={styles.stage} onTouchStart={(event) => { const t = event.touches[0]; if (t) touchStart.current = { x: t.clientX, y: t.clientY }; }} onTouchEnd={endSwipe}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={images[index].url} className={styles.mainImage} src={images[index].url} alt={`${name} — image ${index + 1}`} fetchPriority="high" draggable={false} />
        </div>
        <div className={styles.controls}>
            <button type="button" onClick={() => move(-1)} disabled={images.length < 2} aria-label="Previous image">←</button>
            <p role="status" aria-live="polite">{index + 1} <span>/ {images.length}</span></p>
            <button type="button" onClick={() => move(1)} disabled={images.length < 2} aria-label="Next image">→</button>
        </div>
        {images.length > 1 && <div ref={rail} className={styles.rail} role="group" aria-label="Choose a product image">
            {images.map((image, i) => <button type="button" key={image.id} className={styles.thumbnail} aria-label={`View image ${i + 1}`} aria-pressed={i === index} onClick={() => setSelected(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" loading="lazy" draggable={false} />
            </button>)}
        </div>}
    </section>;
}
