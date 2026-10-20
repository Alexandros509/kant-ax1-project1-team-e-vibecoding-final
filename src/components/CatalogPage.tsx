'use client';
import {useShop} from './ShopRuntime';
import ProductList from '@/domains/products/components/ProductList';
export default function CatalogPage(){const {products,loading,error}=useShop();if(loading)return <p className="p-10 text-xs">{error||'Loading products…'}</p>;return <ProductList products={products}/>;}
