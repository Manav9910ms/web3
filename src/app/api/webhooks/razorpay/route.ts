import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { dispatchNotificationsForOrder, finalizePaidOrder } from "@/lib/order-service";
import { requestFullRefund, verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "Webhook handler is not configured." }, { status: 503 });
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature(rawBody, signature)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid event payload." }, { status: 400 }); }
  if (!["payment.captured", "order.paid"].includes(String(event.event))) return NextResponse.json({ ok: true, ignored: true });

  const payment = event.payload?.payment?.entity || {};
  const razorpayOrder = event.payload?.order?.entity || {};
  const razorpayOrderId = String(payment.order_id || razorpayOrder.id || "");
  let internalOrderId = String(payment.notes?.myshopOrderId || razorpayOrder.notes?.myshopOrderId || "");
  const db = getAdminDb();
  if (!internalOrderId && razorpayOrderId) {
    const query = await db.collection("orders").where("razorpayOrderId", "==", razorpayOrderId).limit(1).get();
    if (!query.empty) internalOrderId = query.docs[0].id;
  }
  if (!internalOrderId) {
    console.error("Could not map Razorpay webhook to a MyShop order", { razorpayOrderId, event: event.event });
    return NextResponse.json({ error: "Order mapping is not ready; retry webhook." }, { status: 503 });
  }

  const eventId = String(request.headers.get("x-razorpay-event-id") || event.id || "");
  const eventRef = eventId ? db.collection("paymentEvents").doc(eventId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 180)) : null;
  if (eventRef) {
    const previous = await eventRef.get();
    if (previous.exists && previous.data()?.processed === true) return NextResponse.json({ ok: true, duplicate: true });
    await eventRef.set({
      eventId,
      event: String(event.event),
      orderId: internalOrderId,
      attempts: FieldValue.increment(1),
      receivedAt: FieldValue.serverTimestamp(),
      processed: false
    }, { merge: true });
  }

  const paymentId = String(payment.id || "");
  if (!paymentId || payment.status !== "captured") return NextResponse.json({ ok: true, ignored: true });
  const orderRef = db.collection("orders").doc(internalOrderId);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) return NextResponse.json({ error: "Internal order is not ready; retry webhook." }, { status: 503 });
  const order = orderSnapshot.data()!;
  if (!order.razorpayOrderId) return NextResponse.json({ error: "Payment link is not ready; retry webhook." }, { status: 503 });
  if (String(order.razorpayOrderId) !== razorpayOrderId ||
      Number(payment.amount) !== Number(order.totalPaise) ||
      String(payment.currency || "") !== "INR") {
    return NextResponse.json({ error: "Payment details do not match the internal order." }, { status: 400 });
  }

  try {
    const outcome = await finalizePaidOrder(internalOrderId, paymentId);
    if (outcome === "expired") {
      try { await requestFullRefund(paymentId, internalOrderId); }
      catch (error) { console.error("Late-payment refund needs manual reconciliation", internalOrderId, error); }
      await orderRef.update({ paymentStatus: "refund_required", razorpayPaymentId: paymentId, updatedAt: FieldValue.serverTimestamp() });
    }
    if (eventRef) await eventRef.set({ processed: true, outcome, processedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (outcome === "paid" || outcome === "already_paid") await dispatchNotificationsForOrder(internalOrderId);
    return NextResponse.json({ ok: true, outcome });
  } catch (error) {
    console.error("Webhook order finalization failed", { internalOrderId, error });
    if (eventRef) await eventRef.set({ processed: false, processingError: String(error) }, { merge: true });
    return NextResponse.json({ error: "Payment event could not be fully processed." }, { status: 500 });
  }
}