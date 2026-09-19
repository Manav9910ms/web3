"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import type { Product } from "../lib/types";

const artByCategory: Record<string,string>={Home:"☕",Workspace:"💡",Lifestyle:"🥤",Fashion:"👕",Electronics:"🔌",Beauty:"✨"};

export function ProductCard({product}:{product:Product}){
  const {addItem}=useCart();
  const art=artByCategory[product.category]||"🛍️";
  return <article className="card product-card">
    <Link href={`/products/${product.slug}`}><div className="product-art">{art}</div></Link>
    <div className="product-body">
      <div className="info-row"><span className="badge">{product.category}</span>{product.sourceType==="resell" && <span className="badge badge-brand">Curated</span>}</div>
      <Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
      <p>{product.shortDescription}</p>
      <div className="product-bottom">
        <div><span className="price">₹{product.price.toLocaleString("en-IN")}</span>{product.compareAtPrice && product.compareAtPrice>product.price && <span className="old-price">₹{product.compareAtPrice.toLocaleString("en-IN")}</span>}</div>
        <button className="btn btn-primary" onClick={()=>addItem(product)}>Add</button>
      </div>
    </div>
  </article>;
}
