import {NextRequest,NextResponse} from "next/server";
import {FieldValue,Timestamp} from "firebase-admin/firestore";
import {getAdminDb,isFirebaseAdminConfigured} from "@/lib/firebase/admin";
import {releaseReservation} from "@/lib/order-service";
import {sendNotification} from "@/lib/notifications";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return NextResponse.json({error:"Unauthorized."},{status:401});if(!isFirebaseAdminConfigured())return NextResponse.json({error:"Firebase Admin is not configured."},{status:503});
 const db=getAdminDb(),now=Date.now();let released=0,attempted=0,sent=0,failed=0;const orders=await db.collection("orders").where("status","==","payment_pending").limit(100).get();
 for(const doc of orders.docs){const expiry=doc.data().reservationExpiresAt as Timestamp|undefined;if(expiry&&expiry.toMillis()<=now){await releaseReservation(doc.id).catch(e=>console.error("Reservation release failed",doc.id,e));released++;}}
 const jobs=await db.collection("notificationOutbox").where("status","==","pending").limit(80).get();
 for(const doc of jobs.docs){const old=doc.data(),next=old.nextAttemptAt as Timestamp|undefined;if(next&&next.toMillis()>Date.now())continue;const claimed=await db.runTransaction(async tx=>{const s=await tx.get(doc.ref);if(!s.exists||s.data()!.status!=="pending")return false;const due=s.data()!.nextAttemptAt as Timestamp|undefined;if(due&&due.toMillis()>Date.now())return false;tx.update(doc.ref,{status:"sending",updatedAt:FieldValue.serverTimestamp()});return true;});if(!claimed)continue;attempted++;
  try{await sendNotification({channel:old.channel,phone:String(old.phone||""),orderNumber:String(old.orderNumber||old.orderId||""),deliveryDate:String(old.deliveryDate||""),totalPaise:Number(old.totalPaise||0)});await doc.ref.update({status:"sent",sentAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),lastError:FieldValue.delete()});sent++;}
  catch(e){const count=Number(old.attempts||0)+1;await doc.ref.update({status:count>=5?"failed":"pending",attempts:count,nextAttemptAt:Timestamp.fromDate(new Date(Date.now()+Math.min(60,2**count*2)*60000)),lastError:e instanceof Error?e.message.slice(0,500):"Notification failed",updatedAt:FieldValue.serverTimestamp()});failed++;}
 }
 return NextResponse.json({ok:true,releasedExpiredReservations:released,attempted,sent,failed});
}