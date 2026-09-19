import { NextResponse } from "next/server";
import { getFirebaseAdminStatus } from "../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const firebase = getFirebaseAdminStatus();
  return NextResponse.json({
    ok: true,
    app: "myshop",
    firebase,
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    timestamp: new Date().toISOString()
  });
}
