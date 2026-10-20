import {validProductPrice} from '@/lib/product-list-utils';
import {formatPrice} from '@/shared/utils/formatPrice';

export default function ProductPrice({salePrice,listPrice}:{salePrice?:unknown;listPrice?:unknown}){
 const price={salePrice,listPrice};
 if(!validProductPrice(price))return <span className="text-sm">Price unavailable</span>;
 return <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 break-words">
   <span className="text-sm"><span className="sr-only">Sale price </span>{formatPrice(price.salePrice)}</span>
   {price.salePrice<price.listPrice&&<del className="text-xs text-neutral-500"><span className="sr-only">Regular price </span>{formatPrice(price.listPrice)}</del>}
 </div>;
}
