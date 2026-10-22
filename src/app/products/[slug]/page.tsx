"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import type {Product} from "@/lib/types";
import {formatPrice} from "@/components/product-card";
import {useCart} from "@/lib/cart-context";
export default function ProductPage(){
 const params=useParams<{slug:string}>(),slug=decodeURIComponent(params.slug||"");const [p,setP]=useState<Product|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState("");const cart=useCart();
 useEffect(()=>{fetch("/api/products",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load product.");setP((d.products||[]).find((x:Product)=>x.slug===slug)||null);}).catch(e=>setError(e instanceof Error?e.message:"Unable to load product.")).finally(()=>setBusy(false));},[slug]);
 if(busy)return <div className="page-shell loading-line">Loading product…</div>;
 if(error||!p)return <div className="page-shell"><div className="empty-state"><h2>Product not found</h2><p>{error||"This product may no longer be available."}</p><Link href="/" className="button button-primary">Back to shop</Link></div></div>;
 return <div className="page-shell"><p className="muted"><Link href="/">Shop</Link> / {p.category}</p><section className="product-detail">{p.imageUrl?<img className="product-detail-image" src={p.imageUrl} alt={p.name}/>:<div className="product-detail-image photo-fallback">MY SHOP</div>}<div className="product-detail-copy"><span className="product-category">{p.category}</span><h1>{p.name}</h1><div className="detail-price">{formatPrice(p.pricePaise)} <span className="detail-unit">/ {p.unitLabel}</span></div><p className="description">{p.description||"An everyday pick from your local shop."}</p><p className="detail-stock">{p.availableStock>0?p.availableStock+" available right now":"Currently sold out"}</p><div className="form-actions"><button className="button button-primary" disabled={p.availableStock<1} onClick={()=>cart.addItem(p)}>Add to basket</button><Link href="/cart" className="button">View basket ({cart.count})</Link></div><div className="delivery-callout"><strong>⌂ Saturday home delivery</strong><p>Orders are scheduled for Saturday only. Your eligible date is confirmed at checkout.</p></div></div></section></div>;
}