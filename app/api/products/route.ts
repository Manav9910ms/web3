import { NextResponse } from "next/server";
import { getCatalog, publicProduct } from "../../../lib/server-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getCatalog();
  return NextResponse.json({ products: products.map(publicProduct) });
}
