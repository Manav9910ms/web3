import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "../../../../lib/firebase-admin";
import { releaseInventory } from "../../../../lib/inventory";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const signature = request.headers.get("x-razorpay-signature") || "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const db = getAdminDb();

    if (!secret || !db || !signature) {
      return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
    }

    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const valid = expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });

    const event = JSON.parse(raw);
    const orderId =
      event.payload?.payment?.entity?.order_id ||
      event.payload?.order?.entity?.id ||
      "";

    if (!orderId) return NextResponse.json({ ok: true });

    const snapshot = await db.collection("orders").where("razorpayOrderId", "==", orderId).limit(1).get();
    if (snapshot.empty) return NextResponse.json({ ok: true });

    const orderRef = snapshot.docs[0].ref;
    const internalOrderId = snapshot.docs[0].id;

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentId = event.payload?.payment?.entity?.id || null;
      await orderRef.update({
        paymentStatus: "paid",
        orderStatus: "paid",
        ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        paidAt: new Date()
      });
    }

    if (event.event === "payment.failed") {
      await orderRef.update({ paymentStatus: "failed", orderStatus: "cancelled" });
      await releaseInventory(db, internalOrderId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }
}
