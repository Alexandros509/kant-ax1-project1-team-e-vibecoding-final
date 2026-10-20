'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { useShop } from '@/components/ShopRuntime';
import ProductCard from './ProductCard';
import type { Product } from '@/domains/products/types/product.types';
import styles from './ProductCollections.module.scss';

const FAVORITES = 'demo-v1-onepiece-favorite-products';
const RECENT = 'demo-v1-onepiece-recent-products';
const MAX_FAVORITES = 100;
const MAX_RECENT = 12;

function readIds(key: string, limit: number): number[] {
    const stored = localStorage.getItem(key) || '[]';
    let value: unknown;
    try { value = JSON.parse(stored); } catch { return []; }
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))].slice(0, limit);
}

function ProductRow({ title, products, empty, saved, onToggle, action }: {
    title: string; products: Product[]; empty: string; saved: number[];
    onToggle: (id: number) => void; action?: ReactNode;
}) {
    const rail = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ previous: false, next: false });

    useEffect(() => {
        const element = rail.current;
        if (!element) return;
        const check = () => setEdges({ previous: element.scrollLeft > 1, next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2 });
        const observer = new ResizeObserver(check);
        observer.observe(element);
        element.addEventListener('scroll', check, { passive: true });
        check();
        return () => { observer.disconnect(); element.removeEventListener('scroll', check); };
    }, [products.length]);

    function scroll(direction: number) {
        const element = rail.current;
        if (!element) return;
        element.scrollBy({ left: element.clientWidth * direction, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }

    return <section className={styles.section} aria-label={title}>
        <div className={styles.header}>
            <h2>{title}<span>{products.length}</span></h2>
            <div className={styles.actions}>{action}
                {(edges.previous || edges.next) && <div className={styles.arrows}>
                    <button type="button" aria-label={`Previous ${title} items`} disabled={!edges.previous} onClick={() => scroll(-1)}>←</button>
                    <button type="button" aria-label={`Next ${title} items`} disabled={!edges.next} onClick={() => scroll(1)}>→</button>
                </div>}
            </div>
        </div>
        {products.length ? <div className={styles.rail} ref={rail}>
            {products.map(product => <article className={styles.card} key={product.id}>
                <ProductCard product={product} showInfo />
                <button type="button" className={styles.heart} aria-pressed={saved.includes(product.id)} aria-label={`${saved.includes(product.id) ? 'Remove' : 'Save'} ${product.name} ${saved.includes(product.id) ? 'from' : 'to'} wishlist`} onClick={() => onToggle(product.id)}>
                    <Heart size={17} strokeWidth={1.4} fill={saved.includes(product.id) ? 'currentColor' : 'none'} />
                </button>
            </article>)}
        </div> : <p className={styles.empty}>{empty}</p>}
    </section>;
}

export default function ProductCollections({ currentId }: { currentId: number }) {
    const { products } = useShop();
    const [saved, setSaved] = useState<number[]>([]), [recent, setRecent] = useState<number[]>([]);
    const [ready, setReady] = useState(false), [storageError, setStorageError] = useState(false), [message, setMessage] = useState('');
    useEffect(() => {
        let live=true;
        const load=async()=>{await Promise.resolve();if(!live)return;try{setSaved(readIds(FAVORITES,MAX_FAVORITES));setRecent(readIds(RECENT,MAX_RECENT));}catch{setStorageError(true);}setReady(true);};
        try{const ids=[currentId,...readIds(RECENT,MAX_RECENT).filter(id=>id!==currentId)].slice(0,MAX_RECENT);localStorage.setItem(RECENT,JSON.stringify(ids));}catch{}
        void load();
        const update=()=>void load();window.addEventListener('storage',update);
        return()=>{live=false;window.removeEventListener('storage',update);};
    },[currentId]);
    function toggleFavorite(id:number){
        if(!ready)return;setMessage('');let latest=saved;try{latest=readIds(FAVORITES,MAX_FAVORITES);}catch{setStorageError(true);}
        const removing=latest.includes(id);if(!removing&&latest.length>=MAX_FAVORITES){setMessage('You can save up to 100 products.');return;}
        const next=removing?latest.filter(value=>value!==id):[id,...latest];setSaved(next);
        try{localStorage.setItem(FAVORITES,JSON.stringify(next));setMessage(removing?'Removed from your wishlist.':'Saved in this browser.');}catch{setStorageError(true);setMessage('This selection cannot be saved in this browser.');}
    }
    const findProducts=(ids:number[])=>ids.flatMap(id=>{const product=products.find(p=>p.id===id);return product?[product]:[];});
    const isSaved=saved.includes(currentId);
    return <div className={styles.collections}>
        <ProductRow title="You may also like" products={findProducts(saved)} empty={ready?'Save your favorites to see them here.':'Loading your favorites…'} saved={saved} onToggle={toggleFavorite}
            action={<button type="button" className={styles.saveCurrent} disabled={!ready} aria-pressed={isSaved} onClick={()=>toggleFavorite(currentId)}><Heart size={14} strokeWidth={1.5} fill={isSaved?'currentColor':'none'}/>{isSaved?'Remove from wishlist':'Add to wishlist'}</button>}/>
        <p className={styles.feedback} role="status">{message}{storageError&&' Browser storage is unavailable. Selections will not persist after closing this page.'}</p>
        <ProductRow title="Recently viewed" products={findProducts(recent.filter(id=>id!==currentId))} empty="Products you view will appear here." saved={saved} onToggle={toggleFavorite}/>
    </div>;
}