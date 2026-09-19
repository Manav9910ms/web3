"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CartItem, Product } from "../lib/types";

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "myshop-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items,setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try { const raw=localStorage.getItem(STORAGE_KEY); if(raw) setItems(JSON.parse(raw)); } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    addItem: (product, quantity=1) => setItems(current => {
      const existing=current.find(item=>item.product.id===product.id);
      if(existing) return current.map(item=>item.product.id===product.id
        ? {...item,quantity:Math.min(item.quantity+quantity,product.stock)} : item);
      return [...current,{product,quantity:Math.min(quantity,product.stock)}];
    }),
    removeItem: productId => setItems(current => current.filter(item=>item.product.id!==productId)),
    setQuantity: (productId,quantity) => setItems(current => current.map(item =>
      item.product.id===productId ? {...item,quantity} : item).filter(item=>item.quantity>0)),
    clear: () => setItems([]),
    itemCount: items.reduce((sum,item)=>sum+item.quantity,0),
    subtotal: items.reduce((sum,item)=>sum+item.product.price*item.quantity,0)
  }),[items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value=useContext(CartContext);
  if(!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
