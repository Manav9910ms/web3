"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import type { Product } from "../lib/types";

const artByCategory: Record<string,string>={Home:"☕",Workspace:"💡",Lifestyle:"🥤",Fashion:"👕",Electronics:"🔌",Beauty:"✨"};

export function ProductDetail({product}:{product:Product}){
  const [quantity,setQuantity]=useState(1);
  const {addItem}=useCart();
  const art=artByCategory[product.category]||"🛍️";
  const background=product.images?.[0] ? {backgroundImage:"url(" + product.images[0] + ")"} : undefined;
  return <div className="product-detail">
    <div className={"product-large-art "+(product.images?.[0]?"has-image":"")} style={background}>{!product.images?.[0]&&art}</div>
    <div className="product-info">
      <div className="info-row"><span className="badge">{product.category}</span>{product.sourceType==="resell"&&<span className="badge badge-brand">Curated pick</span>}</div>
      <h1>{product.name}</h1>
      <p className="section-copy">{product.shortDescription}</p>
      <div style={{margin:"20px 0"}}><span className="price" style={{fontSize:30}}>₹{product.price.toLocaleString("en-IN")}</span>{product.compareAtPrice&&product.compareAtPrice>product.price&&<span className="old-price">₹{product.compareAtPrice.toLocaleString("en-IN")}</span>}</div>
      <p className="description">{product.description}</p>
      <div className="info-row"><span className={product.stock>0?"badge badge-success":"badge badge-danger"}>{product.stock>0?product.stock+" in stock":"Out of stock"}</span><span className="badge">SKU {product.sku}</span></div>
      <div className="buy-row">
        <div className="qty"><button onClick={()=>setQuantity(q=>Math.max(1,q-1))}>−</button><span>{quantity}</span><button onClick={()=>setQuantity(q=>Math.min(product.stock,q+1))}>+</button></div>
        <button className="btn btn-primary" disabled={!product.stock} onClick={()=>addItem(product,quantity)}>Add to cart</button>
      </div>
      <div className="notice">Secure checkout is handled server-side. Your sourcing details are never shown on the storefront.</div>
    </div>
  </div>;
}
