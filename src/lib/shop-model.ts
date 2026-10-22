export type Variant = {id:number; productId:number; sku:string; color:string; size:string; price:number; available:boolean};
export type CatalogProduct = {id:number; name:string; brand:string; category:string; categoryId:number; color:string; price:number; listPrice:number; available:boolean; images:string[]; description:string; careInfo?:string; shippingInfo?:string; isNew?:boolean; sizeGuide:{columns:string[]; rows:string[][]}; variants:Variant[]; sourceUrl:string};
export type BasketItem = {variantId:number; quantity:number};
export type ExperimentSession = {variant:'A'|'B'; experimentId:string; consent:boolean; registered:boolean; snapshotId:string; gaId:string; experimentEnabled:boolean; emailLoginConfigured:boolean; profileEditable:boolean; cartPersistence:'browser'|'database'; tossConfigured:boolean; cart?:BasketItem[]; member:{name:string;provider:string}|null};
export const EXPERIMENT_ID='card-information-v1';
export const MAX_QUANTITY=10;
export function validateBasket(value:unknown): BasketItem[] {
 if(!Array.isArray(value)||value.length===0||value.length>50) throw new Error('Please select 1–50 products.');
 const seen=new Set<number>();
 return value.map((item:BasketItem)=>{
  if(!item||!Number.isSafeInteger(item.variantId)||item.variantId<1||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>MAX_QUANTITY||seen.has(item.variantId)) throw new Error('Invalid product option or quantity.');
  seen.add(item.variantId);return {variantId:item.variantId,quantity:item.quantity};
 }).sort((a,b)=>a.variantId-b.variantId);
}
