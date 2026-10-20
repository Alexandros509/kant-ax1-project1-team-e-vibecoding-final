import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'ONEPIECE | Fictional Shopping Demo',description:'A team learning project with synthetic products. No real sales or deliveries.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
