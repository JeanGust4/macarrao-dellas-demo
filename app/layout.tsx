import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Macarrão Dellas · Feito do seu jeito',description:'Escolha sua massa, capriche nos acompanhamentos e acompanhe seu pedido. Uma nova experiência Macarrão Dellas.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>;}
