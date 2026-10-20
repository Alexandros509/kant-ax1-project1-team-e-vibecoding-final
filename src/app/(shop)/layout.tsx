import {Suspense} from 'react';
import Header from '@/shared/components/Header';
import Footer from '@/shared/components/Footer';
import ShopRuntime from '@/components/ShopRuntime';
export default function Layout({children}:{children:React.ReactNode}){return <Suspense><ShopRuntime><div className="pb-15"><Header/>{children}<Footer/></div></ShopRuntime></Suspense>;}
