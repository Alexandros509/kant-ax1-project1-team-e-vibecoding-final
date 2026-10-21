import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export type RawProduct={id:string;handle:string;title:string;vendor:string;tags:string[];source_url:string;material_origin_facts:string[];size_guide:{columns:string[];rows:string[][]};options:{name:string;position:number}[];image_references:{url:string;position:number}[];variants:{id:string;sku:string;option1:string|null;option2:string|null;option3:string|null;title:string;price:string;available:boolean}[]};
type Source={snapshot_id:string;products:RawProduct[]};
let source:Promise<Source>|undefined;
export function catalogSource(){return source??=readFile(path.join(process.cwd(),'data','products.json'),'utf8').then(t=>JSON.parse(t) as Source);}
export function stableId(kind:string,key:string){const h=createHash('sha256').update(kind+'|'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;}
export async function variantDbId(id:number){const raw=await catalogSource();const variant=raw.products.flatMap(p=>p.variants)[id-1];if(!variant)throw new Error('Invalid product option.');return id;}
export const categoryGroups:[string,string[]][]=[['outer',['jackets','puffers']],['top',['t-shirts','hoodies','long sleeves','knitwear','shirts','sleeveless']],['bottom',['pants','shorts','tights']],['accessories',['bags','headwear','shoes','etc']]];
export function sourceCategory(p:RawProduct){const tags=p.tags.map(t=>['longsleeve','longsleeves'].includes(t.toLowerCase())?'long sleeves':t.toLowerCase());return categoryGroups.flatMap(([,children])=>children).find(c=>tags.includes(c))||'etc';}
export function sourceOption(p:RawProduct,v:RawProduct['variants'][number]){const values=[v.option1,v.option2,v.option3];const color=p.options.findIndex(o=>/colou?r|색상|컬러/i.test(o.name));const size=p.options.findIndex(o=>/size|사이즈/i.test(o.name));return {color:color>=0?values[color]||'':'',size:size>=0?values[size]||'OS':v.title||'OS'};}
