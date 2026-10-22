import Link from 'next/link';
export default function Footer(){return <footer className="w-full border-t bg-white px-6 py-6 text-xs">
 <div className="flex flex-wrap items-end justify-between gap-6"><p>ONEPIECE</p>
 <nav aria-label="Store information" className="flex gap-6"><Link href="/about">ABOUT</Link><Link href="/products">SHOP</Link><span>ENGLISH</span></nav></div>
 </footer>;}
