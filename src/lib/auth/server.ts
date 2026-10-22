import type {NextRequest} from "next/server";
import {getAdminAuth} from "@/lib/firebase/admin";
export async function getRequestUser(req:NextRequest){
 const h=req.headers.get("authorization")||"";if(!h.startsWith("Bearer "))return null;
 try{return await getAdminAuth().verifyIdToken(h.slice(7),true);}catch{return null;}
}
export async function requireAdmin(req:NextRequest){
 const user=await getRequestUser(req);
 if(!user)return {user:null,response:Response.json({error:"Sign in to continue."},{status:401})};
 const owners=(process.env.ADMIN_UIDS||"").split(",").map(x=>x.trim()).filter(Boolean);
 if(user.admin!==true&&!owners.includes(user.uid))return {user,response:Response.json({error:"This account is not authorized to access shop admin."},{status:403})};
 return {user,response:null};
}