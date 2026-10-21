import Link from 'next/link';
export default function Footer(){return <footer className="w-full border-t bg-white px-6 py-6 text-xs">
 <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="mb-3">ONEPIECE · Fictional learning project</p><p>No real products, sales or deliveries. Test payments only.</p><p className="mt-1">Project-supplied imagery and fictional test catalog. Not affiliated with any referenced brand or payment provider.</p></div>
 <nav aria-label="Demo information" className="flex gap-6"><Link href="/about">ABOUT / NOTICES</Link><Link href="/products">SHOP DEMO</Link><span>ENGLISH</span></nav></div>
 </footer>;}
