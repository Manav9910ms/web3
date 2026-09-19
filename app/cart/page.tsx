"use client";

import Link from "next/link";
import { useCart } from "../../components/CartProvider";
import { getShippingFee } from "../../lib/pricing";

const artByCategory: Record<string,string>={Home:"☕",Workspace:"💡",Lifestyle:"🥤",Fashion:"👕",Electronics:"🔌",Beauty:"✨"};

export default function CartPage(){
  const {items,subtotal,setQuantity,removeItem}=useCart();
  const shipping=getShippingFee(subtotal);
  if(!items.length) return <div className="container section"><div className="empty"><h2>Your cart is empty</h2><p>Add something from the shop to get started.</p><Link href="/" className="btn btn-primary">Browse products</Link></div></div>;

  return <div className="container section">
    <div className="section-head"><div><h2>Your cart</h2><p className="section-copy">{items.length} product line{items.length===1?"":"s"}</p></div><Link href="/" className="btn btn-ghost">Continue shopping</Link></div>
    <div className="checkout-layout" style={{paddingTop:0}}>
      <div className="panel"><div className="cart-list">{items.map(item=><div className="cart-row" key={item.product.id}>
        <div className="cart-art">{artByCategory[item.product.category]||"🛍️"}</div>
        <div><strong>{item.product.name}</strong><div className="section-copy">₹{item.product.price.toLocaleString("en-IN")} each</div><button className="btn btn-danger" style={{marginTop:8,padding:"7px 10px"}} onClick={()=>removeItem(item.product.id)}>Remove</button></div>
        <div className="cart-actions"><div className="qty"><button onClick={()=>setQuantity(item.product.id,item.quantity-1)}>−</button><span>{item.quantity}</span><button onClick={()=>setQuantity(item.product.id,Math.min(item.product.stock,item.quantity+1))}>+</button></div></div>
      </div>)}</div></div>
      <aside className="panel"><h3>Order summary</h3><div className="summary-row"><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div><div className="summary-row"><span>Shipping</span><strong>{shipping===0?"Free":"₹"+shipping}</strong></div><div className="summary-row summary-total"><span>Total</span><strong>₹{(subtotal+shipping).toLocaleString("en-IN")}</strong></div><Link href="/checkout" className="btn btn-primary" style={{display:"block",textAlign:"center",marginTop:15}}>Continue to checkout</Link></aside>
    </div>
  </div>;
}
