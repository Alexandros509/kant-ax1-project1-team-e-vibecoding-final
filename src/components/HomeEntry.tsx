'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShop } from './ShopRuntime';
import useAppFlow from '@/shared/hooks/useAppFlow';
import { CampaignHero } from '@/domains/home/components/CampaignHero';

export default function HomeEntry() {
    const { session, preview, error } = useShop();
    const surface = useAppFlow(), router = useRouter();
    useEffect(() => {
        if (surface === 'web' && session && !session.registered && !preview) router.replace('/login');
    }, [surface, session, preview, router]);
    if (surface !== 'web' || session?.registered || preview) return <CampaignHero />;
    return <main className="grid min-h-[70svh] place-items-center bg-white text-black" aria-label="Opening OnePiece">
        <p role="status" className="font-serif text-2xl">{error ? 'Please refresh to continue.' : 'OnePiece'}</p>
    </main>;
}
