import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
const working=process.argv.includes('--working-tree');
const indexed=name=>working?readFileSync(name):execFileSync('git',['show',`:${name}`],{maxBuffer:16*1024*1024});
const files=[...new Set(execFileSync('git',working?['ls-files','--cached','--others','--exclude-standard','-z']:['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(name=>name&&(!working||existsSync(name))))];
const manifest=JSON.parse(indexed('docs/asset-manifest.json').toString('utf8'));
const assets=new Map(manifest.assets.map(a=>[a.path,a]));
const errors=[],fail=(file,reason)=>errors.push(`${file}: ${reason}`);
const approvedBinary=name=>{
 const asset=assets.get(name);
 return (asset?.kind==='user-provided-product-image'&&/^public\/images\/products\/[A-Za-z0-9_-]+\.png$/.test(name)) || (asset?.kind==='user-created-campaign'&&['public/campaign/campaign-video.mp4','public/campaign/campaign-poster.jpg'].includes(name));
};
const forbidden=/(^|\/)(?:node_modules|\.local|\.next|\.vercel|uploads|\.vscode)(\/|$)|\.(?:db|sqlite\w*|dump|bak|zip|7z|tar|gz|mp4|mov|png|jpe?g|webp|ico|pdf|html|pem|key|p12|pfx)$/i;
const secrets=[/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/,/AKIA[0-9A-Z]{16}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/\b(?:live|test)_(?:sk|ck)_[A-Za-z0-9]{16,}\b/,/\b(?:sb_secret_|service_role_)[A-Za-z0-9_-]{20,}/,/postgres(?:ql)?:\/\/[^\s/]+:[^\s@]+@/,/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/];
for(const name of files){
 const binary=approvedBinary(name);
 if((forbidden.test(name)&&!binary)||name==='.git-vercel-demo-link'||name==='next-env.d.ts'||name.endsWith('.tsbuildinfo'))fail(name,'forbidden publication path/type');
 if((name.split('/').at(-1).startsWith('.env')&&name!=='.env.example')||(name.startsWith('backups/')&&name!=='backups/README.md'))fail(name,'private environment/backup file');
 const bytes=indexed(name);
 if(binary){
  if(bytes.length>10*1024*1024)fail(name,'approved media exceeds the reviewed per-file size');
  if(name.endsWith('.png')&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))fail(name,'invalid PNG signature');
  if(name.endsWith('.mp4')&&bytes.toString('ascii',4,8)!=='ftyp')fail(name,'invalid MP4 container');
  if(name.endsWith('.jpg')&&(bytes[0]!==255||bytes[1]!==216))fail(name,'invalid JPEG signature');
  continue;
 }
 const limit=['data/products.json','supabase/seed.sql','docs/catalog-image-mapping.json'].includes(name)?8*1024*1024:2*1024*1024;
 if(bytes.includes(0)||bytes.length>limit)fail(name,'unapproved binary or oversized text file');
 const content=bytes.toString('utf8');
 if(secrets.some(pattern=>pattern.test(content)))fail(name,'possible credential (value suppressed)');
 if(/C:\\Users\\|C:\/Users\//i.test(content))fail(name,'private absolute user path');
 if(/cdn\.shopify\.com|sansangear\.com\/(?:products|cdn|s\/files)/i.test(content))fail(name,'reference-store product/media URL');
 if(name==='.env.example')for(const line of content.split(/\r?\n/)){
  const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&!['LOCAL_DB_PATH','APP_ORIGIN'].includes(match[1])&&match[2].trim())fail(name,'environment template has populated key');
 }
 if(name.startsWith('public/')||name==='src/app/icon.svg'){
  if(!name.endsWith('.svg'))fail(name,'unapproved public media; add explicit reviewed provenance');
  if(/<(?:script|foreignObject|image)\b|(?:href|src)=['"](?:https?:|data:)|@import|url\(https?:/i.test(content))fail(name,'SVG has executable/embedded/external content');
 }
}
for(const asset of manifest.assets){
 if(!files.includes(asset.path)){fail(asset.path,'manifest asset is not tracked');continue;}
 if(!asset.provenance)fail(asset.path,'missing provenance statement');
 const bytes=indexed(asset.path);
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)fail(asset.path,'manifest checksum mismatch');
 if(asset.bytes!==undefined&&asset.bytes!==bytes.length)fail(asset.path,'manifest size mismatch');
}
for(const name of files.filter(f=>f.startsWith('public/')||f==='src/app/icon.svg'||f==='data/products.json'))if(!assets.has(name))fail(name,'missing asset provenance');
const fixture=JSON.parse(indexed('data/products.json').toString('utf8')),used=new Set();
if(fixture.products.length!==366)fail('data/products.json','expected 366 product cards');
for(const product of fixture.products){
 if(product.vendor!=='ONEPIECE DEMO'||!product.id.startsWith('demo-')||!product.title.startsWith('DEMO '))fail('data/products.json','non-demo product metadata');
 if(!product.source_url.startsWith('/demo/'))fail('data/products.json','external product source URL');
 for(const image of product.image_references){
  const asset=assets.get('public'+image.url);
  if(!image.url.startsWith('/images/products/')||asset?.kind!=='user-provided-product-image')fail('data/products.json','unapproved product image URL');
  used.add(image.url);
 }
}
if(used.size!==59)fail('data/products.json','expected all 59 provided product PNGs to be used');
if(files.includes('supabase/seed.sql')){
 const sql=indexed('supabase/seed.sql').toString('utf8'),allowed=new Set(['categories','products','product_variants','product_images']);
 for(const table of [...sql.matchAll(/INSERT INTO\s+"?([a-z_]+)"?/gi)].map(m=>m[1]))if(!allowed.has(table))fail('supabase/seed.sql','non-catalog data table');
 if(/https?:\/\//i.test(sql))fail('supabase/seed.sql','external content URL');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Publication checks passed: ${files.length} reviewed files (${working?'working tree':'index'}), ${manifest.assets.length} manifest-listed assets, 366 cards and 59 local product images. Not a legal or exhaustive secret audit.`);
