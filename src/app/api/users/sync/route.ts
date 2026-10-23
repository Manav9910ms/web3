import {FieldValue} from "firebase-admin/firestore";
import {NextRequest,NextResponse} from "next/server";
import {getAdminAuth,getAdminDb} from "@/lib/firebase/admin";

export const dynamic="force-dynamic";

export async function POST(req:NextRequest){
 const header=req.headers.get("authorization")||"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return NextResponse.json({error:"Sign in is required."},{status:401});
 try{
  const decoded=await getAdminAuth().verifyIdToken(token);
  const user=await getAdminAuth().getUser(decoded.uid);
  const trustedAdmins=(process.env.ADMIN_UIDS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const ref=getAdminDb().collection("users").doc(user.uid);
  const existing=await ref.get();
  await ref.set({
   uid:user.uid,
   displayName:user.displayName||"",
   email:user.email||"",
   photoURL:user.photoURL||"",
   phoneNumber:user.phoneNumber||"",
   provider:user.providerData.map(p=>p.providerId).join(","),
   ...(existing.exists?{}:{createdAt:FieldValue.serverTimestamp()}),
   lastLoginAt:FieldValue.serverTimestamp(),
   isAdmin:trustedAdmins.includes(user.uid),
   updatedAt:FieldValue.serverTimestamp()
  },{merge:true});
  return NextResponse.json({ok:true,uid:user.uid,isAdmin:trustedAdmins.includes(user.uid)});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"Unable to save your user profile."},{status:401});
 }
}
