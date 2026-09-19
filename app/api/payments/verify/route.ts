import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const internalOrderId = String(body.internalOrderId || "");
    const paymentId = String(body.razorpayPaymentId || "");
    const razorpayOrderId = String(body.razorpayOrderId || "");
    const signature = String(body.razorpaySignature || "");

    if (!internalOrderId || !paymentId || !razorpayOrderId || !signature) {
      return NextResponse.json({ error: "Incomplete payment response." }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db || !process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_KEY_ID) {
      return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
    }

    const orderRef = db.collection("orders").doc(internalOrderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const order = orderSnap.data()!;
    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: "Payment order mismatch." }, { status: 400 });
    }
    if (order.orderStatus === "cancelled") {
      return NextResponse.json({ error: "This order has been cancelled." }, { status: 409 });
    }

    const digest = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + "|" + paymentId)
      .digest("hex");

    const valid = digest.length === signature.length &&
      timingSafeEqual(Buffer.from(digest), Buffer.from(signature));

    if (!valid) return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });

    const authorization = "Basic " + Buffer.from(
      String(process.env.RAZORPAY_KEY_ID) + ":" + String(process.env.RAZORPAY_KEY_SECRET)
    ).toString("base64");

    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: authorization },
      cache: "no-store"
    });
    const payment = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return NextResponse.json({ error: "Could not verify payment status with Razorpay." }, { status: 502 });
    }
    if (payment.order_id !== razorpayOrderId) {
      return NextResponse.json({ error: "Payment does not belong to this order." }, { status: 400 });
    }
    if (payment.status !== "captured") {
      return NextResponse.json({ error: "Payment is not captured yet. The webhook will reconcile its final state." }, { status: 409 });
    }

    await orderRef.update({
      paymentStatus: "paid",
      orderStatus: "paid",
      razorpayPaymentId: paymentId,
      paidAt: new Date()
    });

    return NextResponse.json({ ok: true, orderId: internalOrderId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment verification failed." }, { status: 500 });
  }
}
