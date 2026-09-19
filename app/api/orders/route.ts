import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "../../../lib/firebase-admin";

function jsonDate(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as {toDate:()=>Date}).toDate === "function") {
    return (value as {toDate:()=>Date}).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export async function GET(request: Request) {
  try {
    const auth = getAdminAuth();
    const db = getAdminDb();
    if (!auth || !db) throw new Error("Server Firebase Admin credentials are not configured.");

    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const user = await auth.verifyIdToken(token);
    const snapshot = await db.collection("orders").where("customer.userId", "==", user.uid).get();
    const orders = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id, createdAt: jsonDate(data.createdAt) };
      })
      .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load orders." }, { status: 500 });
  }
}
