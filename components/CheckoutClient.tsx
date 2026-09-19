"use client";

import Script from "next/script";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";
import { calculateTotal, getShippingFee } from "../lib/pricing";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function CheckoutClient() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const [form, setForm] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: ""
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const shippingFee = getShippingFee(subtotal);
  const total = useMemo(() => calculateTotal(subtotal), [subtotal]);

  function change(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!items.length) {
      router.replace("/cart");
      return;
    }

    setBusy(true);
    try {
      const token = user ? await user.getIdToken() : "";
      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify({
          items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          customer: form
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not create order.");

      if (payload.mode === "demo") {
        localStorage.setItem("myshop-last-order", JSON.stringify(payload.order));
        clear();
        setInfo("Demo order created. Connect Firebase + Razorpay environment variables to enable live checkout.");
        router.push("/account?demo=1");
        return;
      }

      if (!window.Razorpay) throw new Error("Razorpay Checkout failed to load.");

      const checkout = new window.Razorpay({
        key: payload.keyId,
        amount: payload.amount,
        currency: payload.currency,
        name: process.env.NEXT_PUBLIC_STORE_NAME || "MyShop",
        description: "MyShop order " + payload.internalOrderId,
        order_id: payload.razorpayOrderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { internalOrderId: payload.internalOrderId },
        theme: { color: "#5b4bff" },
        handler: async (response: Record<string, string>) => {
          try {
            const verify = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                internalOrderId: payload.internalOrderId,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              })
            });
            const verified = await verify.json();
            if (!verify.ok) throw new Error(verified.error || "Payment verification failed.");
            clear();
            router.push("/account?paid=1");
          } catch (verificationError) {
            setError(verificationError instanceof Error ? verificationError.message : "Payment verification failed.");
          } finally {
            setBusy(false);
          }
        }
      });
      checkout.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setBusy(false);
    }
  }

  if (!items.length) {
    return <div className="container section"><div className="empty"><h2>No items to checkout</h2><p>Add a product first.</p><button className="btn btn-primary" onClick={() => router.push("/")}>Shop now</button></div></div>;
  }

  return <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
    <div className="container checkout-layout">
      <form className="panel" onSubmit={submit}>
        <span className="badge badge-brand">CHECKOUT</span>
        <h1>Delivery details</h1>
        <p className="section-copy">We will use these details for fulfilment and order updates.</p>
        {error && <div className="error" style={{margin:"15px 0"}}>{error}</div>}
        {info && <div className="success" style={{margin:"15px 0"}}>{info}</div>}
        <div className="form-grid">
          <div className="field"><label>Name</label><input required value={form.name} onChange={e=>change("name",e.target.value)} /></div>
          <div className="field"><label>Email</label><input required type="email" value={form.email} onChange={e=>change("email",e.target.value)} /></div>
          <div className="field"><label>Phone</label><input required value={form.phone} onChange={e=>change("phone",e.target.value)} placeholder="+91..." /></div>
          <div className="field"><label>Pincode</label><input required inputMode="numeric" pattern="[0-9]{6}" value={form.pincode} onChange={e=>change("pincode",e.target.value)} /></div>
          <div className="field full"><label>Address line 1</label><input required value={form.addressLine1} onChange={e=>change("addressLine1",e.target.value)} /></div>
          <div className="field full"><label>Address line 2</label><input value={form.addressLine2} onChange={e=>change("addressLine2",e.target.value)} /></div>
          <div className="field"><label>City</label><input required value={form.city} onChange={e=>change("city",e.target.value)} /></div>
          <div className="field"><label>State</label><input required value={form.state} onChange={e=>change("state",e.target.value)} /></div>
          <div className="field full"><button className="btn btn-primary" disabled={busy}>{busy?"Processing…":"Pay ₹"+total.toLocaleString("en-IN")}</button></div>
        </div>
      </form>

      <aside className="panel">
        <h2>Summary</h2>
        <div className="cart-list">{items.map(item=><div className="summary-row" key={item.product.id}><span>{item.product.name} × {item.quantity}</span><strong>₹{(item.product.price*item.quantity).toLocaleString("en-IN")}</strong></div>)}</div>
        <div className="summary-row"><span>Subtotal</span><strong>₹{subtotal.toLocaleString("en-IN")}</strong></div>
        <div className="summary-row"><span>Shipping</span><strong>{shippingFee===0?"Free":"₹"+shippingFee}</strong></div>
        <div className="summary-row summary-total"><span>Total</span><strong>₹{total.toLocaleString("en-IN")}</strong></div>
        <div className="notice" style={{marginTop:16}}>Payments use Razorpay when configured. The server recalculates the cart from the catalog before creating the payment order.</div>
      </aside>
    </div>
  </>;
}
