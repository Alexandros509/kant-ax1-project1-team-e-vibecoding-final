import { Suspense } from 'react';
import CatalogPage from '@/components/CatalogPage';
export default function Page(){return <Suspense fallback={<p>Loading products…</p>}><CatalogPage/></Suspense>;}
