'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Menu} from '@base-ui/react/menu';
import {ChevronDown} from 'lucide-react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {Product} from '@/domains/products/types/product.types';
import {CATALOG_CATEGORIES} from '@/lib/catalog-adapter';
import {normalizeProductSort,productListUrl,sortProducts,type ProductSort} from '@/lib/product-list-utils';
import ProductGrid from './ProductGrid';
import styles from './ProductList.module.scss';

const sortLabels:Record<ProductSort,string>={'default':'Default','price-asc':'Price Asc','price-desc':'Price Desc'};

export default function ProductList({products}:{products:Product[]}){
 const params=useSearchParams(),router=useRouter();
 const [grid,setGrid]=useState('6'),[announcement,setAnnouncement]=useState('');
 const pendingSort=useRef<ProductSort|null>(null);
 const primary=useRef<HTMLElement>(null),secondary=useRef<HTMLElement>(null);
 const query=params.toString();
 const category=CATALOG_CATEGORIES.find(c=>c.id===params.get('category'));
 const topId=category?(category.parent_id??category.id):null;
 const tops=CATALOG_CATEGORIES.filter(c=>c.parent_id===null).sort((a,b)=>a.sort_order-b.sort_order);
 const children=topId===null?[]:CATALOG_CATEGORIES.filter(c=>c.parent_id===topId).sort((a,b)=>a.sort_order-b.sort_order);
 const sort=normalizeProductSort(params.get('sort'));
 const filtered=category?products.filter(p=>p.categoryId===category.id||CATALOG_CATEGORIES.some(c=>c.id===p.categoryId&&c.parent_id===category.id)):products;
 const visible=sortProducts(filtered,sort);

 useEffect(()=>{
  for(const menu of [primary.current,secondary.current]){
   const selected=menu?.querySelector<HTMLElement>('[data-selected="true"]');
   if(!menu||!selected)continue;
   const item=selected.getBoundingClientRect(),box=menu.getBoundingClientRect();
   if(item.left<box.left||item.right>box.right)menu.scrollTo({left:menu.scrollLeft+item.left-box.left-(menu.clientWidth-item.width)/2,behavior:'auto'});
  }
 },[category?.id]);
 useEffect(()=>{if(pendingSort.current===sort){setAnnouncement(`${visible.length} products sorted by ${sortLabels[sort]}.`);pendingSort.current=null;}},[sort,visible.length]);
 function changeSort(value:string){const next=normalizeProductSort(value);pendingSort.current=next;router.push(productListUrl(query,{sort:next}),{scroll:false});}
 function categoryLink(id:string|null,label:string,selected:boolean,current:boolean){return <Link href={productListUrl(query,{category:id})} scroll={false} className={selected?styles.selected:undefined} data-selected={selected} aria-current={current?'page':undefined}>{label}</Link>;}

 return <section aria-label="Products">
  <div id="top" className={styles.toolbar}>
   <div className={styles.columns} role="group" aria-label="Product columns">{['3','4','6'].map(value=><button type="button" key={value} aria-label={`${value} columns`} aria-pressed={grid===value} onClick={()=>setGrid(value)}>{value}</button>)}</div>
   <div className={styles.menus}>
    <nav ref={primary} className={`${styles.menu} ${styles.primary}`} aria-label="Product categories"><ul><li>{categoryLink(null,'ALL',!category,!category)}</li>{tops.map(c=><li key={c.id}>{categoryLink(c.id,c.name,topId===c.id,category?.id===c.id)}</li>)}</ul></nav>
    {children.length>0&&<nav ref={secondary} className={styles.menu} aria-label="Product subcategories"><ul><li>{categoryLink(topId,'ALL',category?.id===topId,category?.id===topId)}</li>{children.map(c=><li key={c.id}>{categoryLink(c.id,c.name,category?.id===c.id,category?.id===c.id)}</li>)}</ul></nav>}
   </div>
   <div className={styles.sort}>
    <Menu.Root>
     <Menu.Trigger className={styles.sortTrigger} aria-label={`Sort products: ${sortLabels[sort]}`}><span>{sortLabels[sort]}</span><ChevronDown size={14} strokeWidth={1.5} aria-hidden="true"/></Menu.Trigger>
     <Menu.Portal><Menu.Positioner align="end" side="bottom" sideOffset={6} className={styles.sortPositioner}>
      <Menu.Popup className={styles.sortPopup} aria-label="Sort products">
       <Menu.RadioGroup value={sort} onValueChange={value=>changeSort(String(value))}>
        {Object.entries(sortLabels).map(([value,label])=><Menu.RadioItem key={value} value={value} closeOnClick className={styles.sortOption}>{label}</Menu.RadioItem>)}
       </Menu.RadioGroup>
      </Menu.Popup>
     </Menu.Positioner></Menu.Portal>
    </Menu.Root>
   </div>
  </div>
  <p aria-live="polite" className="sr-only">{announcement}</p>
  <p className={styles.count}>{visible.length} PRODUCTS</p>
  <div className="px-5 pb-24"><ProductGrid products={visible} grid={grid}/></div>
 </section>;
}
