import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { demoProducts } from "../../../../lib/demo-products";
import { getAdminDb, optionalUser } from "../../../../lib/firebase-admin";
import { calculateTotal, getShippingFee, roundMoney } from "../../../../lib/pricing";
import { reserveInventory } from "../../../../lib/inventory";
import type { CustomerInfo } from "../../../../lib/types";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

function validCustomer(customer: CustomerInfo) {
  return Boolean(
    customer &&
    customer.name?.trim() &&
    customer.email?.includes("@") &&
    customer.phone?.trim() &&
    customer.addressLine1?.trim() &&
    customer.city?.trim() &&
    customer.state?.trim() &&
    /^[0-9]{6}$/.test(customer.pincode || "")
  );
}

export async function POST(request: Request) {
  let internalOrderId = "";
  let reservedDb: ReturnType<typeof getAdminDb> = null;

  try {
    const body = await request.json();
    const requestedItems = Array.isArray(body.items) ? body.items : [];
    const customer = body.customer as CustomerInfo;

    if (!requestedItems.length || requestedItems.length > 30) {
      return NextResponse.json({ error: "Your cart is empty or too large." }, { status: 400 });
    }
    if (!validCustomer(customer)) {
      return NextResponse.json({ error: "Please provide complete delivery details." }, { status: 400 });
    }

    const user = await optionalUser(request);
    const db = getAdminDb();
    const sourceProducts = db ? await db.collection("products").get() : null;

    const productMap = new Map<string, Record<string, any>>();
    if (sourceProducts && !sourceProducts.empty) {
      sourceProducts.docs.forEach(doc => productMap.set(doc.id, { id: doc.id, ...doc.data() }));
    } else {
      demoProducts.forEach(product => productMap.set(product.id, product));
    }

    const items: any[] = [];
    let subtotal = 0;

    for (const requested of requestedItems) {
      const product = productMap.get(String(requested.productId));
      const quantity = Number(requested.quantity);
      if (!product || !product.active || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "One or more products are no longer available." }, { status: 400 });
      }
      if (quantity > Number(product.stock || 0)) {
        return NextResponse.json({ error: product.name + " has only " + product.stock + " left." }, { status: 409 });
      }

      const unitPrice = Number(product.price || 0);
      const lineTotal = roundMoney(unitPrice * quantity);
      subtotal = roundMoney(subtotal + lineTotal);

      items.push({
        productId: product.id,
        slug: String(product.slug),
        name: String(product.name),
        sku: String(product.sku),
        quantity,
        unitPrice,
        lineTotal,
        image: Array.isArray(product.images) ? product.images[0] : undefined
      });
    }

    const shippingFee = getShippingFee(subtotal);
    const total = calculateTotal(subtotal);
    internalOrderId = "MS-" + randomUUID().slice(0, 8).toUpperCase();

    const safeCustomer = {
      userId: user?.uid || null,
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.trim(),
      addressLine1: customer.addressLine1.trim(),
      addressLine2: customer.addressLine2?.trim() || "",
      city: customer.city.trim(),
      state: customer.state.trim(),
      pincode: customer.pincode.trim()
    };

    const orderData = {
      customer: safeCustomer,
      items,
      subtotal,
      shippingFee,
      discount: 0,
      total,
      currency: "INR",
      paymentStatus: "pending",
      orderStatus: "pending_payment",
      inventoryReserved: false,
      inventoryReleased: false,
      createdAt: FieldValue.serverTimestamp()
    };

    const financeItems = items.map(item => {
      const product = productMap.get(item.productId);
      const costPrice = Number(product?.costPrice || 0);
      const lineCost = roundMoney(costPrice * item.quantity);
      return {
        productId: item.productId,
        name: item.name,
        quantity: item.quantity,
        costPrice,
        lineCost,
        lineRevenue: item.lineTotal,
        estimatedGrossProfit: roundMoney(item.lineTotal - lineCost)
      };
    });

    if (!db || !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({
        mode: "demo",
        order: { id: internalOrderId, ...orderData, createdAt: new Date().toISOString() }
      });
    }

    reservedDb = db;
    await db.collection("orders").doc(internalOrderId).set(orderData);
    await db.collection("order_finance").doc(internalOrderId).set({
      orderId: internalOrderId,
      items: financeItems,
      totalCost: roundMoney(financeItems.reduce((sum, item) => sum + item.lineCost, 0)),
      estimatedGrossProfit: roundMoney(financeItems.reduce((sum, item) => sum + item.estimatedGrossProfit, 0) - shippingFee),
      createdAt: FieldValue.serverTimestamp()
    });

    await reserveInventory(db, internalOrderId, items.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    })));

    const authorization = "Basic " + Buffer.from(
      String(process.env.RAZORPAY_KEY_ID) + ":" + String(process.env.RAZORPAY_KEY_SECRET)
    ).toString("base64");

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify({
        amount: Math.round(total * 100),
        currency: "INR",
        receipt: internalOrderId,
        notes: { internalOrderId }
      }),
      cache: "no-store"
    });

    const razorpayPayload = await razorpayResponse.json();
    if (!razorpayResponse.ok) {
      await db.collection("orders").doc(internalOrderId).update({ paymentStatus: "failed", orderStatus: "cancelled" });
      await releaseInventory(db, internalOrderId);
      return NextResponse.json({ error: razorpayPayload.error?.description || "Razorpay order creation failed." }, { status: 502 });
    }

    await db.collection("orders").doc(internalOrderId).update({ razorpayOrderId: razorpayPayload.id });

    return NextResponse.json({
      mode: "live",
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: razorpayPayload.amount,
      currency: razorpayPayload.currency,
      razorpayOrderId: razorpayPayload.id,
      internalOrderId
    });
  } catch (error) {
    if (reservedDb && internalOrderId) {
      try {
        await reservedDb.collection("orders").doc(internalOrderId).update({ paymentStatus: "failed", orderStatus: "cancelled" });
        const { releaseInventory } = await import("../../../../lib/inventory");
        await releaseInventory(reservedDb, internalOrderId);
      } catch {}
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create checkout." }, { status: 500 });
  }
}
