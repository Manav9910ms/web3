"use client";
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import type {CartLine,Product} from "@/lib/types";
type Value={items:CartLine[];count:number;subtotalPaise:number;addItem:(p:Product,q?:number)=>void;setQuantity:(id:string,q:number)=>void;removeItem:(id:string)=>void;clearCart:()=>void};
const Context=createContext<Value|null>(null),KEY="myshop-cart-v1";
export function CartProvider({children}:{children:React.ReactNode}){
 const [items,setItems]=useState<CartLine[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{try{const s=localStorage.getItem(KEY);if(s){const v=JSON.parse(s);if(Array.isArray(v))setItems(v.filter(x=>x&&x.product&&Number(x.quantity)>0));}}catch{localStorage.removeItem(KEY);}setReady(true);},[]);
 useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(items));},[items,ready]);
 const addItem=useCallback((p:Product,q=1)=>setItems(cur=>{const old=cur.find(x=>x.product.id===p.id),n=Math.min(p.availableStock,(old?.quantity||0)+q);if(n<=0)return cur;const product={id:p.id,name:p.name,slug:p.slug,imageUrl:p.imageUrl,pricePaise:p.pricePaise,unitLabel:p.unitLabel,availableStock:p.availableStock};return old?cur.map(x=>x.product.id===p.id?{product,quantity:n}:x):[...cur,{product,quantity:Math.min(q,p.availableStock)}];}),[]);
 const setQuantity=useCallback((id:string,q:number)=>setItems(cur=>cur.flatMap(x=>{if(x.product.id!==id)return[x];const n=Math.min(x.product.availableStock,Math.floor(q));return n>0?[{...x,quantity:n}]:[];})),[]);
 const removeItem=useCallback((id:string)=>setItems(cur=>cur.filter(x=>x.product.id!==id)),[]),clearCart=useCallback(()=>setItems([]),[]);
 const value=useMemo(()=>({items,count:items.reduce((s,x)=>s+x.quantity,0),subtotalPaise:items.reduce((s,x)=>s+x.product.pricePaise*x.quantity,0),addItem,setQuantity,removeItem,clearCart}),[items,addItem,setQuantity,removeItem,clearCart]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCart(){const v=useContext(Context);if(!v)throw new Error("useCart must be inside CartProvider");return v;}