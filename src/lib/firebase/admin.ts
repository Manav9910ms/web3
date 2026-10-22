import {cert,getApps,initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
export function isFirebaseAdminConfigured(){return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);}
function adminApp(){
 if(!isFirebaseAdminConfigured())throw new Error("Firebase Admin is not configured. Set a server-side service account.");
 const old=getApps().find(a=>a.name==="myshop-admin");if(old)return old;
 let account:Record<string,unknown>;
 if(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64)account=JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,"base64").toString("utf8"));
 else account=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string);
 if(typeof account.private_key==="string")account.private_key=(account.private_key as string).replace(/\\n/g,"\n");
 return initializeApp({credential:cert(account as Parameters<typeof cert>[0]),projectId:String(account.project_id||process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||""),storageBucket:process.env.FIREBASE_STORAGE_BUCKET||process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET},"myshop-admin");
}
export function getAdminDb(){return getFirestore(adminApp());}
export function getAdminAuth(){return getAuth(adminApp());}
export function getAdminStorage(){return getStorage(adminApp());}