import {FieldValue} from "firebase-admin/firestore";
import {NextRequest,NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth/server";
import {getAdminDb} from "@/lib/firebase/admin";
import {DEFAULT_SETTINGS} from "@/lib/shop";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){const g=await requireAdmin(req);if(g.response)return g.response;const s=await getAdminDb().collection("shopSettings").doc("main").get();return NextResponse.json({settings:{...DEFAULT_SETTINGS,...(s.data()||{})}},{headers:{"Cache-Control":"no-store"}});}
export async function PATCH(req:NextRequest){
 const g=await requireAdmin(req);if(g.response)return g.response;let b:any;try{b=await req.json();}catch{return NextResponse.json({error:"Invalid settings."},{status:400});}
 const hour=Number(b.cutoffHour),minute=Number(b.cutoffMinute),fee=Number(b.deliveryFeePaise),minimum=Number(b.minOrderPaise),capacity=Number(b.maxOrdersPerDeliveryDate);
 const pins=Array.from(new Set((Array.isArray(b.deliveryPincodes)?b.deliveryPincodes:[]).map((x:unknown)=>String(x).trim()).filter((x:string)=>/^\d{6}$/.test(x))));
 if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59||!Number.isSafeInteger(fee)||fee<0||!Number.isSafeInteger(minimum)||minimum<0||!Number.isInteger(capacity)||capacity<1)return NextResponse.json({error:"Check cutoff time, fees, minimum order and capacity."},{status:400});
 const value={shopName:DEFAULT_SETTINGS.shopName,timezone:"Asia/Kolkata",cutoffDayOfWeek:5,cutoffHour:hour,cutoffMinute:minute,deliveryDayOfWeek:6,deliveryPincodes:pins,deliveryFeePaise:fee,minOrderPaise:minimum,maxOrdersPerDeliveryDate:capacity,ordersEnabled:b.ordersEnabled===true,updatedAt:FieldValue.serverTimestamp(),updatedBy:g.user!.uid};
 await getAdminDb().collection("shopSettings").doc("main").set(value,{merge:true});const {updatedAt,...safe}=value;return NextResponse.json({ok:true,settings:{...DEFAULT_SETTINGS,...safe}});
}