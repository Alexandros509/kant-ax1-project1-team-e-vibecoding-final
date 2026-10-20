import type {Product} from '@/domains/products/types/product.types';
import type {Category} from '@/domains/categories/types/category.types';
import type {CatalogProduct} from './shop-model';
export const CATALOG_CATEGORIES:Category[]=[
 {id:'1',name:'OUTER',parent_id:null,depth:0,sort_order:1},{id:'2',name:'TOP',parent_id:null,depth:0,sort_order:2},{id:'3',name:'BOTTOM',parent_id:null,depth:0,sort_order:3},{id:'4',name:'E.T.C',parent_id:null,depth:0,sort_order:4},
 ...[['11','JACKET','1'],['13','PADDING','1'],['12','COAT','1'],['21','T-SHIRT','2'],['23','HOODIE','2'],['22','KNIT','2'],['24','SHIRT','2'],['25','LONG SLEEVE','2'],['26','SLEEVELESS','2'],['31','PANTS','3'],['32','DENIM','3'],['33','SHORTS','3'],['34','TIGHTS','3'],['41','SHOES','4'],['42','BAGS','4'],['43','ACCESSORIES','4'],['44','HEADWEAR','4']].map(([id,name,parent_id],i)=>({id,name,parent_id,depth:1,sort_order:i+1}))
];
const categories:Record<string,string>={jackets:'11',puffers:'13','t-shirts':'21',hoodies:'23',knitwear:'22',shirts:'24','long sleeves':'25',sleeveless:'26',pants:'31',shorts:'33',tights:'34',shoes:'41',bags:'42',etc:'43',headwear:'44'};
export function adaptProduct(p:CatalogProduct):Product{
 const categoryId=categories[p.category]||'43';
 const englishDetails=p.description.split('\n').filter(line=>!/[가-힣]/.test(line)).join('\n').trim();
 return {id:p.id,categoryId,categoryName:CATALOG_CATEGORIES.find(c=>c.id===categoryId)?.name||'ACCESSORIES',name:p.name,size:0,detail:englishDetails||'Please refer to the product images and garment label for details.',productCare:p.careInfo?.trim()||'Refer to the care label attached to each garment for washing and care instructions.',shipping:p.shippingInfo?.trim()||'This is a demo store. Payments use test mode, and no items are shipped. Demo delivery is free. Returns do not apply to test orders.',listPrice:p.listPrice,salePrice:p.price,new:p.isNew===true,images:p.images.map((url,i)=>({id:p.id*10000+i,gid:String(p.id),location:i===0?'product_main':'product_desc',original_name:new URL(url,'https://demo.invalid').pathname.split('/').pop()||'',content_type:'',extension:'',file_size:0,done:false,seq:i+1,created_at:'',url}))};
}
