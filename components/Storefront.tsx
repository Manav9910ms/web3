"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import type { Product } from "../lib/types";

export function Storefront({products}:{products:Product[]}){
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("All");
  const categories=useMemo(()=>["All",...Array.from(new Set(products.map(p=>p.category)))],[products]);
  const visible=useMemo(()=>products.filter(product=>{
    const matchesCategory=category==="All"||product.category===category;
    const haystack=[product.name,product.shortDescription,product.category,...product.tags].join(" ").toLowerCase();
    return matchesCategory&&haystack.includes(query.toLowerCase());
  }),[products,query,category]);

  return <>
    <section className="hero"><div className="container hero-grid"><div>
      <span className="eyebrow">MYSHOP · CURATED GOODS</span>
      <h1>Useful things, without the clutter.</h1>
      <p>Shop products from my store alongside carefully selected sourced items. One simple checkout, one order timeline, one place to shop.</p>
      <div className="actions"><a href="#products" className="btn btn-primary">Explore products</a><Link href="/account" className="btn btn-ghost">Track an order</Link></div>
    </div><div className="hero-card"><span className="badge badge-brand">Shop + Resell</span><h3>Built for a small business that wants to grow.</h3><p>Your sourcing cost stays private while customers see a clean, trustworthy shopping experience.</p></div></div></section>

    <section className="section" id="products"><div className="container">
      <div className="section-head"><div><h2>Shop all</h2><p className="section-copy">{visible.length} products available</p></div><div className="field" style={{minWidth:250}}><input aria-label="Search products" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products..." /></div></div>
      <div className="filters">{categories.map(item=><button key={item} className={"filter "+(category===item?"active":"")} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      {visible.length ? <div className="grid">{visible.map(product=><ProductCard key={product.id} product={product}/>)}</div> : <div className="empty"><h2>No products found</h2><p>Try another search or category.</p></div>}
    </div></section>

    <section className="section"><div className="container"><div className="panel"><span className="badge badge-success">Business ready</span><h2 style={{margin:"14px 0 8px"}}>Your sourcing workflow stays behind the scenes.</h2><p className="section-copy">Own-stock products and Meesho-sourced products use the same storefront, while the admin console tracks cost, margin and fulfilment separately.</p></div></div></section>

    <footer className="footer"><div className="container footer-grid"><div><div className="brand">MyShop</div><p>Good products. Simple shopping.</p></div><div><h4>Customer</h4><p><Link href="/login">Sign in</Link></p><p><Link href="/account">Order history</Link></p></div><div><h4>Store</h4><p>Secure checkout</p><p>India delivery</p></div></div></footer>
  </>;
}
