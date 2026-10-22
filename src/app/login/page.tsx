"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {onAuthStateChanged,signOut,type User} from "firebase/auth";
import {auth} from "@/lib/firebase/client";
import {PhoneLogin} from "@/components/phone-login";
export default function LoginPage(){const [user,setUser]=useState<User|null>(null);useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,setUser);},[]);return <div className="page-shell"><div className="auth-wrap"><span className="eyebrow">WELCOME TO MYSHOP</span><h1 style={{fontSize:"clamp(2rem,4vw,3.15rem)"}}>A little closer to home.</h1><p>Sign in with your mobile number to keep your orders together and see delivery updates.</p>{user?<div className="panel"><div className="success-box">Signed in as {user.phoneNumber||user.uid}.</div><div className="form-actions"><Link className="button button-primary" href="/my-orders">View orders</Link><Link className="button" href="/checkout">Checkout</Link><button className="button" onClick={()=>auth&&signOut(auth)}>Sign out</button></div></div>:<PhoneLogin/>}<p className="tiny muted">Notification preferences are selected separately at checkout.</p></div></div>;}