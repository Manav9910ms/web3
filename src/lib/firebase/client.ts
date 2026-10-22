"use client";
import {getApp,getApps,initializeApp} from "firebase/app";
import {getAuth} from "firebase/auth";
const config={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID,storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET};
export const isFirebaseClientConfigured=Boolean(config.apiKey&&config.authDomain&&config.projectId&&config.appId);
const app=isFirebaseClientConfigured?(getApps().length?getApp():initializeApp(config)):null;
export const auth=app?getAuth(app):null;