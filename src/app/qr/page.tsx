"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./qr-print.css";
export default function ShopQrPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const isTestUrl = origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("vercel.app");
  const url = origin ? origin + "/" : "https://myshop.example/";
  return <div className="qr-page">
    <div className="qr-toolbar"><div><span className="eyebrow">IN-STORE QR POSTER</span><h2>Bring your shop online</h2><p>Print this poster and place it at your shop entrance.</p></div><button className="button button-primary" onClick={() => window.print()} disabled={!origin}>Print poster</button></div>
    {isTestUrl && <div className="notice-box qr-warning"><strong>Do not print this version yet.</strong> You are viewing a test or preview URL. Open this page on your permanent production domain before printing the final QR.</div>}
    <article className="qr-poster"><span className="qr-brand"><span className="brand-mark">m</span> myshop<span className="brand-dot">.</span></span><span className="eyebrow">YOUR NEIGHBOURHOOD STORE</span><h1>Your local shop.<br/><span>Just a scan away.</span></h1><p>Scan to explore available products and place your order from home.</p><div className="qr-code-frame"><QRCodeSVG value={url} size={290} level="H" marginSize={4} title="MyShop storefront QR code" /></div><h2>Scan. Shop. Saturday delivery.</h2><p className="qr-address">Home delivery every Saturday · Secure online checkout</p><div className="qr-url">{origin || "Your permanent shop website will appear here"}</div></article>
    <p className="qr-footnote">Before printing: connect your permanent domain, confirm it opens the storefront, and test this QR with a different phone.</p>
  </div>;
}