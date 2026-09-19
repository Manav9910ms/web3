"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase";
import { useAuth } from "./AuthProvider";

type AdminProduct = {
  id:string; name:string; slug:string; price:number; compareAtPrice?:number; costPrice:number;
  sourceType:"own"|"resell"; supplier?:string; sku:string; category:string; stock:number;
  active:boolean; featured:boolean; tags?:string[];
};
type AdminOrder = {
  id:string; total:number; paymentStatus:string; orderStatus:string; createdAt:string;
  customer:{name:string;email:string;phone:string;city:string;state:string};
  finance?:{totalCost?:number;estimatedGrossProfit?:number};
};

const statusOptions=["pending_payment","paid","processing","shipped","delivered","cancelled"];

export function AdminClient(){
  const {user,loading}=useAuth();
  const [products,setProducts]=useState<AdminProduct[]>([]);
  const [orders,setOrders]=useState<AdminOrder[]>([]);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [newProduct,setNewProduct]=useState({
    name:"",shortDescription:"",description:"",price:"",compareAtPrice:"",costPrice:"",stock:"",category:"General",
    sourceType:"own",supplier:"",supplierUrl:"",sku:"",tags:""
  });

  const token=useCallback(async()=>auth?.currentUser?.getIdToken(),[]);

  const load=useCallback(async()=>{
    const idToken=await token();
    if(!idToken) return;
    setError("");
    const headers={Authorization:"Bearer "+idToken};
    const [pRes,oRes]=await Promise.all([
      fetch("/api/admin/products",{headers}),
      fetch("/api/admin/orders",{headers})
    ]);
    const p=await pRes.json();
    const o=await oRes.json();
    if(!pRes.ok) throw new Error(p.error||"Admin product access failed.");
    if(!oRes.ok) throw new Error(o.error||"Admin order access failed.");
    setProducts(p.products||[]);
    setOrders(o.orders||[]);
  },[token]);

  useEffect(()=>{ if(user) load().catch(err=>setError(err instanceof Error?err.message:"Could not load admin data.")); },[user,load]);

  const stats=useMemo(()=>{
    const revenue=orders.filter(o=>["paid","processing","shipped","delivered"].includes(o.paymentStatus==="paid"?o.orderStatus:"")).reduce((sum,o)=>sum+o.total,0);
    const profit=orders.reduce((sum,o)=>sum+Number(o.finance?.estimatedGrossProfit||0),0);
    return {products:products.length,live:products.filter(p=>p.active).length,orders:orders.length,revenue,profit};
  },[products,orders]);

  async function addProduct(){
    setBusy(true);setError("");setMessage("");
    try{
      const idToken=await token(); if(!idToken) throw new Error("Sign in required.");
      const payload={
        ...newProduct,
        price:Number(newProduct.price), compareAtPrice:newProduct.compareAtPrice?Number(newProduct.compareAtPrice):null,
        costPrice:Number(newProduct.costPrice||0), stock:Number(newProduct.stock||0),
        tags:newProduct.tags.split(",").map(v=>v.trim()).filter(Boolean)
      };
      const res=await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+idToken},body:JSON.stringify(payload)});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||"Could not add product.");
      setMessage("Product added.");
      setNewProduct({...newProduct,name:"",shortDescription:"",description:"",price:"",compareAtPrice:"",costPrice:"",stock:"",sku:"",supplier:"",supplierUrl:"",tags:""});
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not add product.");}finally{setBusy(false);}
  }

  async function quickEdit(product:AdminProduct, field:"price"|"stock"|"active"){
    setBusy(true);setError("");setMessage("");
    try{
      const idToken=await token(); if(!idToken) throw new Error("Sign in required.");
      let value:unknown=product[field];
      if(field==="price"){const input=prompt("New selling price",String(product.price));if(input===null)return;value=Number(input);}
      if(field==="stock"){const input=prompt("New stock",String(product.stock));if(input===null)return;value=Number(input);}
      if(field==="active") value=!product.active;
      const res=await fetch("/api/admin/products",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+idToken},body:JSON.stringify({id:product.id,[field]:value})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not update product.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update product.");}finally{setBusy(false);}
  }

  async function deleteProduct(product:AdminProduct){
    if(!confirm("Delete "+product.name+"?")) return;
    setBusy(true);setError("");
    try{
      const idToken=await token();if(!idToken)throw new Error("Sign in required.");
      const res=await fetch("/api/admin/products",{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:"Bearer "+idToken},body:JSON.stringify({id:product.id})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not delete product.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not delete product.");}finally{setBusy(false);}
  }

  async function updateOrder(id:string,orderStatus:string){
    setBusy(true);setError("");
    try{
      const idToken=await token();if(!idToken)throw new Error("Sign in required.");
      const res=await fetch("/api/admin/orders",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+idToken},body:JSON.stringify({id,orderStatus})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Could not update order.");
      await load();
    }catch(err){setError(err instanceof Error?err.message:"Could not update order.");}finally{setBusy(false);}
  }

  if(loading) return <div className="container section"><div className="panel">Loading…</div></div>;
  if(!user) return <div className="container section"><div className="empty"><h2>Admin sign-in required</h2><p>Sign in with the admin account to continue.</p><a className="btn btn-primary" href="/login">Sign in</a></div></div>;

  return <div className="container section">
    <div className="section-head"><div><span className="badge badge-brand">MYSHOP ADMIN</span><h1 style={{margin:"10px 0 4px"}}>Store control center</h1><p className="section-copy">Catalog, sourcing margin and fulfilment in one place.</p></div><button className="btn btn-ghost" onClick={()=>load()} disabled={busy}>Refresh</button></div>
    {error&&<div className="error" style={{marginBottom:16}}>{error}</div>}
    {message&&<div className="success" style={{marginBottom:16}}>{message}</div>}

    <div className="stat-grid">
      <div className="stat"><small>Total products</small><strong>{stats.products}</strong></div>
      <div className="stat"><small>Live products</small><strong>{stats.live}</strong></div>
      <div className="stat"><small>Orders</small><strong>{stats.orders}</strong></div>
      <div className="stat"><small>Tracked gross profit</small><strong>₹{Math.round(stats.profit).toLocaleString("en-IN")}</strong></div>
    </div>

    <div className="admin-grid">
      <section className="panel">
        <h2>Add product</h2>
        <p className="section-copy">For reselling, enter your real acquisition cost. Customers only see the selling price.</p>
        <div className="form-grid">
          {[
            ["name","Product name"],["shortDescription","Short description"],["description","Description"],
            ["price","Selling price"],["compareAtPrice","Compare-at price"],["costPrice","Your cost price"],
            ["stock","Stock"],["category","Category"],["sku","SKU"],["supplier","Supplier"],["supplierUrl","Supplier URL"],["tags","Tags (comma separated)"]
          ].map(([key,label])=><div className="field full" key={key}>
            <label>{label}</label>
            {key==="description" ? <textarea rows={3} value={(newProduct as any)[key]} onChange={e=>setNewProduct(v=>({...v,[key]:e.target.value}))}/> :
              <input value={(newProduct as any)[key]} onChange={e=>setNewProduct(v=>({...v,[key]:e.target.value}))} />}
          </div>)}
          <div className="field"><label>Source</label><select value={newProduct.sourceType} onChange={e=>setNewProduct(v=>({...v,sourceType:e.target.value}))}><option value="own">My stock</option><option value="resell">Resell / sourced</option></select></div>
          <div className="field"><label>Featured</label><select><option>Normal</option><option>Featured</option></select></div>
          <div className="field full"><button className="btn btn-primary" disabled={busy} onClick={addProduct}>{busy?"Saving…":"Add product"}</button></div>
        </div>
      </section>

      <section className="panel">
        <h2>Business snapshot</h2>
        <div className="summary-row"><span>Gross revenue tracked</span><strong>₹{Math.round(stats.revenue).toLocaleString("en-IN")}</strong></div>
        <div className="summary-row"><span>Estimated gross profit</span><strong>₹{Math.round(stats.profit).toLocaleString("en-IN")}</strong></div>
        <div className="summary-row"><span>Active catalogue</span><strong>{stats.live}</strong></div>
        <div className="notice" style={{marginTop:12}}>For Meesho-sourced items, the admin-side cost snapshot is preserved per order so changing a product price later does not rewrite historical margin records.</div>
      </section>

      <section className="panel admin-wide">
        <h2>Catalogue</h2>
        <div className="table-wrap"><table><thead><tr><th>Product</th><th>Source</th><th>Sell</th><th>Cost</th><th>Margin</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {products.map(product=><tr key={product.id}>
            <td><strong>{product.name}</strong><br/><small>{product.sku}</small></td>
            <td>{product.sourceType==="resell"?product.supplier||"Sourced":"Own stock"}</td>
            <td>₹{product.price.toLocaleString("en-IN")}</td>
            <td>₹{Number(product.costPrice||0).toLocaleString("en-IN")}</td>
            <td>{product.price?Math.round(((product.price-Number(product.costPrice||0))/product.price)*100):0}%</td>
            <td>{product.stock}</td>
            <td><span className={product.active?"badge badge-success":"badge badge-danger"}>{product.active?"Live":"Hidden"}</span></td>
            <td><div className="actions"><button className="btn" disabled={busy} onClick={()=>quickEdit(product,"price")}>Price</button><button className="btn" disabled={busy} onClick={()=>quickEdit(product,"stock")}>Stock</button><button className="btn" disabled={busy} onClick={()=>quickEdit(product,"active")}>{product.active?"Hide":"Publish"}</button><button className="btn btn-danger" disabled={busy} onClick={()=>deleteProduct(product)}>Delete</button></div></td>
          </tr>)}
        </tbody></table></div>
      </section>

      <section className="panel admin-wide">
        <h2>Orders</h2>
        {!orders.length ? <p className="section-copy">No orders yet.</p> : <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Profit</th><th>Update</th></tr></thead><tbody>
          {orders.map(order=><tr key={order.id}><td><strong>{order.id}</strong><br/><small>{new Date(order.createdAt).toLocaleString("en-IN")}</small></td><td>{order.customer?.name}<br/><small>{order.customer?.email}</small></td><td>₹{order.total.toLocaleString("en-IN")}</td><td>{order.paymentStatus}</td><td>{order.orderStatus}</td><td>₹{Math.round(Number(order.finance?.estimatedGrossProfit||0)).toLocaleString("en-IN")}</td><td><select value={order.orderStatus} disabled={busy} onChange={e=>updateOrder(order.id,e.target.value)}>{statusOptions.map(status=><option key={status}>{status}</option>)}</select></td></tr>)}
        </tbody></table></div>}
      </section>
    </div>
  </div>;
}
