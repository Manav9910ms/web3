import {FieldValue,Timestamp} from "firebase-admin/firestore";
import {getAdminDb} from "@/lib/firebase/admin";
export async function releaseReservation(id:string,reason="Payment window expired"){
 const db=getAdminDb(),orderRef=db.collection("orders").doc(id);
 await db.runTransaction(async tx=>{
  const snap=await tx.get(orderRef);if(!snap.exists)return;const o=snap.data()!;if(o.paymentStatus!=="created"||o.status!=="payment_pending")return;
  const items=Array.isArray(o.items)?o.items as Array<{productId:string;quantity:number}>:[],refs=items.map(i=>db.collection("products").doc(i.productId)),batchRef=db.collection("deliveryBatches").doc(String(o.deliveryDate||""));
  const [batchSnap,...productSnaps]=await Promise.all([tx.get(batchRef),...refs.map(r=>tx.get(r))]);
  productSnaps.forEach((p,i)=>{if(p.exists)tx.update(refs[i],{reservedStock:Math.max(0,Number(p.data()!.reservedStock||0)-Number(items[i].quantity||0)),updatedAt:FieldValue.serverTimestamp()});});
  if(o.capacityReserved===true&&batchSnap.exists)tx.update(batchRef,{activeOrders:Math.max(0,Number(batchSnap.data()!.activeOrders||0)-1),updatedAt:FieldValue.serverTimestamp()});
  tx.update(orderRef,{status:"cancelled",paymentStatus:"expired",capacityReserved:false,cancellationReason:reason,updatedAt:FieldValue.serverTimestamp()});
 });
}
export async function finalizePaidOrder(id:string,paymentId:string):Promise<"paid"|"already_paid"|"expired"|"not_found">{
 const db=getAdminDb(),ref=db.collection("orders").doc(id);
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref);if(!snap.exists)return "not_found";const o=snap.data()!;
  if(o.paymentStatus==="paid")return "already_paid";if(o.paymentStatus!=="created"||o.status!=="payment_pending")return "expired";
  const exp=o.reservationExpiresAt as Timestamp|undefined;if(exp&&exp.toMillis()<=Date.now())return "expired";
  const items=Array.isArray(o.items)?o.items as Array<{productId:string;quantity:number}>:[],refs=items.map(i=>db.collection("products").doc(i.productId)),docs=await Promise.all(refs.map(r=>tx.get(r)));
  for(let i=0;i<docs.length;i++){if(!docs[i].exists)throw new Error("Order product is missing.");const d=docs[i].data()!;if(Number(d.reservedStock||0)<items[i].quantity||Number(d.stockOnHand||0)<items[i].quantity)throw new Error("Reserved inventory requires manual reconciliation.");}
  docs.forEach((p,i)=>{const item=items[i],d=p.data()!;tx.update(refs[i],{stockOnHand:Number(d.stockOnHand||0)-item.quantity,reservedStock:Number(d.reservedStock||0)-item.quantity,updatedAt:FieldValue.serverTimestamp()});tx.create(db.collection("inventoryMovements").doc(),{productId:item.productId,orderId:id,type:"sale",quantityDelta:-item.quantity,createdAt:FieldValue.serverTimestamp()});});
  tx.update(ref,{status:"confirmed",paymentStatus:"paid",fulfillmentStatus:"confirmed",razorpayPaymentId:paymentId,paidAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});
  const common={orderId:id,orderNumber:String(o.orderNumber||id.slice(0,8)),deliveryDate:String(o.deliveryDate||""),totalPaise:Number(o.totalPaise||0),phone:String(o.customerPhone||""),status:"pending",attempts:0,nextAttemptAt:Timestamp.now(),createdAt:FieldValue.serverTimestamp()};
  if(common.phone&&o.notifyBySms===true)tx.set(db.collection("notificationOutbox").doc(id+"_sms_confirmed"),{...common,channel:"sms"});
  if(common.phone&&o.notifyByWhatsApp===true)tx.set(db.collection("notificationOutbox").doc(id+"_whatsapp_confirmed"),{...common,channel:"whatsapp"});
  return "paid";
 });
}

export async function cleanupExpiredReservations(): Promise<number> {
  const db = getAdminDb();
  const pending = await db.collection("orders").where("status", "==", "payment_pending").limit(100).get();
  let released = 0;
  for (const doc of pending.docs) {
    const expiry = doc.data().reservationExpiresAt as Timestamp | undefined;
    if (expiry && expiry.toMillis() <= Date.now()) {
      try {
        await releaseReservation(doc.id, "Payment window expired");
        released += 1;
      } catch (error) {
        console.error("Could not release expired reservation", doc.id, error);
      }
    }
  }
  return released;
}


export async function dispatchNotificationsForOrder(orderId: string): Promise<void> {
  const db = getAdminDb();
  try {
    const jobs = await db.collection("notificationOutbox").where("orderId", "==", orderId).limit(10).get();
    for (const jobDoc of jobs.docs) {
      const claimed = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(jobDoc.ref);
        if (!fresh.exists || fresh.data()!.status !== "pending") return false;
        const due = fresh.data()!.nextAttemptAt as Timestamp | undefined;
        if (due && due.toMillis() > Date.now()) return false;
        tx.update(jobDoc.ref, { status: "sending", updatedAt: FieldValue.serverTimestamp() });
        return true;
      });
      if (!claimed) continue;
      const job = jobDoc.data();
      try {
        await sendNotification({
          channel: job.channel,
          phone: String(job.phone || ""),
          orderNumber: String(job.orderNumber || orderId),
          deliveryDate: String(job.deliveryDate || ""),
          totalPaise: Number(job.totalPaise || 0)
        });
        await jobDoc.ref.update({
          status: "sent",
          sentAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastError: FieldValue.delete()
        });
      } catch (error) {
        const attempts = Number(job.attempts || 0) + 1;
        await jobDoc.ref.update({
          status: attempts >= 5 ? "failed" : "pending",
          attempts,
          nextAttemptAt: Timestamp.fromDate(new Date(Date.now() + Math.min(24 * 60, 2 ** attempts * 2) * 60_000)),
          lastError: error instanceof Error ? error.message.slice(0, 500) : "Notification delivery failed.",
          updatedAt: FieldValue.serverTimestamp()
        });
        console.error("MyShop notification failed", jobDoc.id, error);
      }
    }
  } catch (error) {
    // A notification failure must not invalidate an already-confirmed payment.
    console.error("Unable to dispatch MyShop notifications", orderId, error);
  }
}
