"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "../../lib/firebase";
import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";

export default function LoginPage(){
  const {user}=useAuth();
  const router=useRouter();
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  if(user){ router.replace("/account"); return null; }

  async function submit(e:FormEvent){
    e.preventDefault(); setError("");
    if(!auth||!db||!firebaseConfigured){setError("Firebase is not configured. Add the Firebase web variables to .env before using accounts.");return;}
    setBusy(true);
    try{
      if(mode==="signup"){
        const credential=await createUserWithEmailAndPassword(auth,email,password);
        await updateProfile(credential.user,{displayName:name});
        await setDoc(doc(db,"users",credential.user.uid),{name,email,role:"customer",createdAt:serverTimestamp()},{merge:true});
      } else {
        await signInWithEmailAndPassword(auth,email,password);
      }
      router.replace("/account");
    }catch(err){
      setError(err instanceof Error?err.message:"Authentication failed.");
    }finally{setBusy(false);}
  }

  return <div className="login-shell"><div className="panel login-card">
    <span className="badge badge-brand">MYSHOP ACCOUNT</span>
    <h1 style={{letterSpacing:"-.04em"}}>{mode==="signin"?"Welcome back":"Create your account"}</h1>
    <p className="section-copy">{mode==="signin"?"Sign in to view orders and account details.":"Create an account for faster checkout and order tracking."}</p>
    {!firebaseConfigured&&<div className="notice" style={{margin:"15px 0"}}>Account features are disabled until Firebase is connected.</div>}
    {error&&<div className="error" style={{margin:"15px 0"}}>{error}</div>}
    <form onSubmit={submit} className="form-grid">
      {mode==="signup"&&<div className="field full"><label>Full name</label><input required value={name} onChange={e=>setName(e.target.value)} /></div>}
      <div className="field full"><label>Email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="field full"><label>Password</label><input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <div className="field full"><button className="btn btn-primary" disabled={busy||!firebaseConfigured}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button></div>
    </form>
    <p className="section-copy">{mode==="signin"?"New here?":"Already have an account?"} <button className="btn btn-ghost" style={{padding:"6px 9px"}} onClick={()=>setMode(mode==="signin"?"signup":"signin")}>{mode==="signin"?"Create one":"Sign in"}</button></p>
    <p><Link href="/">← Back to shop</Link></p>
  </div></div>;
}
