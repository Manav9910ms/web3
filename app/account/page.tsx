"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { getAuth } from "firebase/auth";
import { firebaseConfigured } from "../../lib/firebase";
import type { Order } from "../../lib/types";

const statuses: Record<string,string> = {
  pending_payment:"Payment pending",
  paid:"Paid",
  processing:"Processing",
  shipped:"Shipped",
  delivered:"Delivered",
  cancelled:"Cancelled"
};

export default function AccountPage(){
  const {user,loading}=useAuth();
  const [orders,setOrders]=useState<Order[]>([]);
  const [error,setError]=useState("");

  useEffect(()=>{
    if(!user||!firebaseConfigured) return;
    (async()=>{
      try{
        const token=await getAuth().currentUser?.getIdToken();
        const response=await fetch("/api/orders",{headers:token?{Authorization:"Bearer "+token}:{}});
        const payload=await response.json();
        if(!response.ok) throw new Error(payload.error||"Could not load orders.");
        setOrders(payload.orders||[]);
      }catch(err){setError(err instanceof Error?err.message:"Could not load orders.");}
    })();
  },[user]);

  if(loading) return <div className="container section"><div className="panel">Loading account…</div></div>;
  if(!user) return <div className="login-shell"><div className="panel login-card"><h1>Track your orders</h1><p className="section-copy">Sign in to see your order history and delivery status.</p><Link href="/login" className="btn btn-primary">Sign in</Link></div></div>;

  return <div className="container section">
    <div className="section-head"><div><span className="badge badge-brand">ACCOUNT</span><h1 style={{margin:"10px 0 4px"}}>{user.displayName||"My account"}</h1><p className="section-copy">{user.email}</p></div></div>
    {error&&<div className="error" style={{marginBottom:18}}>{error}</div>}
    {!orders.length ? <div className="empty"><h2>No orders yet</h2><p>Your completed orders will appear here.</p><Link href="/" className="btn btn-primary">Start shopping</Link></div> :
      <div className="account-grid">{orders.map(order=><div className="panel" key={order.id}><div className="section-head"><div><span className="badge">{statuses[order.orderStatus]||order.orderStatus}</span><h3 style={{margin:"10px 0 0"}}>Order {order.id}</h3></div><strong>₹{order.total.toLocaleString("en-IN")}</strong></div><p className="section-copy">{new Date(order.createdAt).toLocaleString("en-IN")}</p><div>{order.items.map(item=><div className="summary-row" key={item.productId}><span>{item.name} × {item.quantity}</span><strong>₹{item.lineTotal.toLocaleString("en-IN")}</strong></div>)}</div><div className="notice">Payment: {order.paymentStatus}. Delivery to {order.customer.city}, {order.customer.state}.</div></div>)}</div>}
  </div>;
}
