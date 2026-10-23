"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,type User} from "firebase/auth";
import {auth,isFirebaseClientConfigured} from "@/lib/firebase/client";

export default function LoginPage(){
 const [user,setUser]=useState<User|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,setUser);},[]);
 async function signIn(){
  setError("");
  if(!isFirebaseClientConfigured||!auth){setError("Firebase is not configured. Check the NEXT_PUBLIC_FIREBASE settings in Vercel.");return;}
  setBusy(true);
  try{await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(e){setError(e instanceof Error?e.message:"Google sign-in failed. Please try again.");}
  finally{setBusy(false);}
 }
 return <div className="page-shell"><div className="auth-wrap"><span className="eyebrow">WELCOME TO MYSHOP</span><h1 style={{fontSize:"clamp(2rem,4vw,3.15rem)"}}>A little closer to home.</h1><p>Sign in with your Google account to keep your orders together and see delivery updates.</p>{user?<div className="panel"><div className="success-box">Signed in as {user.displayName||user.email||user.uid}.</div><div className="form-actions"><Link className="button button-primary" href="/my-orders">View orders</Link><Link className="button" href="/checkout">Checkout</Link><button className="button" onClick={()=>auth&&signOut(auth)}>Sign out</button></div></div>:<div className="panel"><div className="phone-login"><span className="eyebrow">SECURE SIGN IN</span><h2>Continue with Google</h2><p className="muted">Use your Google account to sign in securely. No phone OTP or SMS is needed.</p>{error&&<p className="error-message" role="alert">{error}</p>}<button className="button button-primary button-full" type="button" onClick={signIn} disabled={busy}>{busy?"Connecting to Google…":"Continue with Google"}</button><p className="tiny muted">Your account is secured by Firebase Authentication.</p></div></div>}<p className="tiny muted">Notification preferences are selected separately at checkout.</p></div></div>;
}
