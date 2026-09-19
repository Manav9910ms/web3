"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";

export function Header() {
  const {user}=useAuth();
  const {itemCount}=useCart();

  async function logout(){ if(auth) await signOut(auth); }

  return <>
    <div className="topbar"><div className="container">Free shipping on orders above ₹999 · Secure checkout</div></div>
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="brand">{process.env.NEXT_PUBLIC_STORE_NAME || "MyShop"}</Link>
        <nav className="nav"><Link href="/">Shop</Link><Link href="/account">Orders</Link>{user && <Link href="/admin">Admin</Link>}</nav>
        <div className="actions">
          <Link href="/cart" className="btn btn-ghost">Cart ({itemCount})</Link>
          {user ? <><span className="badge desktop-only">{user.email}</span><button className="btn desktop-only" onClick={logout}>Sign out</button></> : <Link href="/login" className="btn btn-primary">Sign in</Link>}
        </div>
      </div>
    </header>
  </>;
}
