import type {Metadata,Viewport} from "next";
import "./globals.css";
import {CartProvider} from "@/lib/cart-context";
import {SiteHeader} from "@/components/site-header";
export const metadata:Metadata={title:{default:"MyShop — Your neighbourhood shop, online",template:"%s | MyShop"},description:"Browse your local shop's inventory and order for Saturday home delivery.",applicationName:"MyShop",robots:{index:true,follow:true}};
export const viewport:Viewport={themeColor:"#145c43",width:"device-width",initialScale:1};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CartProvider><SiteHeader/><main>{children}</main><footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><span className="brand-mark">m</span><strong>myshop.</strong></div><p>Your neighbourhood shop, just a scan away.</p><div className="footer-links"><a href="/">Shop</a><a href="/my-orders">My orders</a><a href="/admin">Shop admin</a></div><small>Home delivery on Saturdays only · Powered by MyShop</small></div></footer></CartProvider></body></html>;}