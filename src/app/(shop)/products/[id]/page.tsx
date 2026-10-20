import { Suspense } from 'react';
import ProductDetail from '@/domains/products/components/ProductDetail';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <Suspense><ProductDetail id={Number(id)}/></Suspense>;}
