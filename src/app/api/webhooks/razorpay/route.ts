import {NextRequest,NextResponse} from "next/server";
import {FieldValue} from "firebase-admin/firestore";
import {getAdminDb,isFirebaseAdminConfigured} from "@/lib/firebase/admin";
import {finalizePaidOrder} from "@/lib/order-service";
import {requestFullRefund,verifyWebhookSignature} from "@/lib/razorpay";
export async function POST(req:NextRequest){
 if(!isFirebaseAdminConfigured())return NextResponse.json({error:"Webhook not configured."},{status:503});const raw=await req.text(),signature=req.headers.get("x-razorpay-signature")||"";if(!verifyWebhookSignature(raw,signature))return NextResponse.json({error:"Invalid webhook signature."},{status:400});
 let e:any;try{e=JSON.parse(raw);}catch{return NextResponse.json({error:"Invalid event body."},{status:400});}if(!["payment.captured","order.paid"].includes(String(e.event)))return NextResponse.json({ok:true,ignored:true});
 const payment=e.payload?.payment?.entity||{},razOrder=e.payload?.order?.entity||{},rz=String(payment.order_id||razOrder.id||"");let id=String(payment.notes?.myshopOrderId||razOrder.notes?.myshopOrderId||"");const db=getAdminDb();
 if(!id&&rz){const q=await db.collection("orders").where("razorpayOrderId","==",rz).limit(1).get();if(!q.empty)id=q.docs[0].id;}if(!id){console.error("Unmapped Razorpay event",rz,e.event);return NextResponse.json({ok:true,unmapped:true});}
 const eid=String(req.headers.get("x-razorpay-event-id")||e.id||""),eventRef=eid?db.collection("paymentEvents").doc(eid.replace(/[^a-zA-Z0-9_-]/g,"_").slice(0,180)):null;if(eventRef&&(await eventRef.get()).exists)return NextResponse.json({ok:true,duplicate:true});if(eventRef)await eventRef.set({eventId:eid,event:String(e.event),orderId:id,receivedAt:FieldValue.serverTimestamp()});
 const pid=String(payment.id||"");if(!pid||(e.event==="payment.captured"&&payment.status!=="captured"))return NextResponse.json({ok:true,ignored:true});
 try{const out=await finalizePaidOrder(id,pid);if(out==="expired"){try{await requestFullRefund(pid,id);}catch(err){console.error("Late-payment refund failed; manual reconciliation needed",id,err);}await db.collection("orders").doc(id).update({paymentStatus:"refund_required",razorpayPaymentId:pid,updatedAt:FieldValue.serverTimestamp()});}if(eventRef)await eventRef.set({processed:true,outcome:out,processedAt:FieldValue.serverTimestamp()},{merge:true});return NextResponse.json({ok:true,outcome:out});}
 catch(err){console.error("Webhook finalization failed",id,err);if(eventRef)await eventRef.set({processed:false,processingError:String(err)},{merge:true});return NextResponse.json({error:"Payment event could not be processed."},{status:500});}
}