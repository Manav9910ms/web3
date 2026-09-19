import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import { CartProvider } from "../components/CartProvider";
import { Header } from "../components/Header";

export const metadata: Metadata = {
  title: "MyShop",
  description: "Good products. Simple shopping.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main>{children}</main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
