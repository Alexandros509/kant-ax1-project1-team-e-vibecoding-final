import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Inspect only tracked/staged files, never node_modules, ignored local DBs or private backups.
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
if(!files.length)throw new Error('Stage the publication files before running release:check.');
const errors=[];
const fail=(file,reason)=>errors.push(`${file}: ${reason}`);
const forbidden=/(^|\/)(?:node_modules|\.local|\.next|\.vercel|uploads|\.vscode)(\/|$)|\.(?:db|sqlite\w*|dump|bak|zip|7z|tar|gz|mp4|mov|png|jpe?g|webp|ico|pdf|html|pem|key|p12|pfx)$/i;
const secrets=[
 /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/,
 /AKIA[0-9A-Z]{16}/,
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 /\b(?:live|test)_(?:sk|ck)_[A-Za-z0-9]{16,}\b/,
 /\b(?:sb_secret_|service_role_)[A-Za-z0-9_-]{20,}/,
 /postgres(?:ql)?:\/\/[^\s/]+:[^\s@]+@/,
 /\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/,
];
for(const name of files){
 if(forbidden.test(name)||name==='.git-vercel-demo-link'||name==='next-env.d.ts'||name.endsWith('.tsbuildinfo'))fail(name,'forbidden publication path/type');
 if((name.split('/').at(-1).startsWith('.env')&&name!=='.env.example')||(name.startsWith('backups/')&&name!=='backups/README.md'))fail(name,'private environment/backup file');
 // git show reads index bytes, so an ignored or unstaged replacement cannot hide a staged secret.
 const bytes=execFileSync('git',['show',`:${name}`],{maxBuffer:16*1024*1024});
 if(bytes.includes(0)||bytes.length>2*1024*1024)fail(name,'binary or oversized file');
 const content=bytes.toString('utf8');
 if(secrets.some(pattern=>pattern.test(content)))fail(name,'possible credential (value suppressed)');
 if(/C:\\Users\\|C:\/Users\//i.test(content))fail(name,'private absolute user path');
 if(/cdn\.shopify\.com|sansangear\.com\/(?:products|cdn|s\/files)/i.test(content))fail(name,'reference-store product/media URL');
 if(name==='.env.example')for(const line of content.split(/\r?\n/)){
   const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&!['LOCAL_DB_PATH','APP_ORIGIN'].includes(match[1])&&match[2].trim())fail(name,'environment template has populated key');
 }
 if(name.startsWith('public/')||name==='src/app/icon.svg'){
   if(!name.endsWith('.svg'))fail(name,'only manifest-listed original SVG artwork is allowed');
   if(/<(?:script|foreignObject|image)\b|(?:href|src)=['"](?:https?:|data:)|@import|url\(https?:/i.test(content))fail(name,'SVG has executable/embedded/external content');
 }
}
const manifest=JSON.parse(execFileSync('git',['show',':docs/asset-manifest.json'],{encoding:'utf8'}));
const listed=new Set(manifest.assets.map(a=>a.path));
for(const a of manifest.assets){
 if(!files.includes(a.path)){fail(a.path,'manifest asset is not tracked');continue;}
 const bytes=execFileSync('git',['show',`:${a.path}`]);
 if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)fail(a.path,'manifest checksum mismatch; review provenance before updating it');
}
for(const name of files.filter(f=>f.startsWith('public/')||f==='src/app/icon.svg'||f==='data/products.json'))if(!listed.has(name))fail(name,'missing asset provenance');
const fixture=JSON.parse(execFileSync('git',['show',':data/products.json'],{encoding:'utf8'}));
for(const p of fixture.products){
 if(p.vendor!=='ONEPIECE DEMO'||!p.id.startsWith('demo-')||!p.title.startsWith('DEMO '))fail('data/products.json','non-demo product');
 if(!p.source_url.startsWith('/demo/'))fail('data/products.json','external source URL');
 for(const img of p.image_references)if(!img.url.startsWith('/demo/')||!listed.has('public'+img.url))fail('data/products.json','unlisted/local-image violation');
}
if(files.includes('supabase/seed.sql')){
 const sql=execFileSync('git',['show',':supabase/seed.sql'],{encoding:'utf8'});
 const allowed=new Set(['brands','categories','products','product_colors','product_variants','inventories','product_images','product_categories']);
 for(const table of [...sql.matchAll(/INSERT INTO\s+"?([a-z_]+)"?/gi)].map(m=>m[1]))if(!allowed.has(table))fail('supabase/seed.sql','non-catalog data table');
 if(/https?:\/\//i.test(sql))fail('supabase/seed.sql','external content URL');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Publication checks passed for ${files.length} tracked files and ${manifest.assets.length} original demo assets. This is not a legal or exhaustive secret audit.`);
