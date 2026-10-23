import type {Metadata} from "next"; import "./globals.css";
export const metadata:Metadata={title:"MyShop — Good finds. Great feeling.",description:"Find your next favourite at MyShop."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}