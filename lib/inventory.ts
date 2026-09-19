import type { Firestore } from "firebase-admin/firestore";

export async function reserveInventory(
  db: Firestore,
  orderId: string,
  items: Array<{ productId: string; quantity: number }>
) {
  await db.runTransaction(async transaction => {
    const refs = items.map(item => db.collection("products").doc(item.productId));
    const snaps = await Promise.all(refs.map(ref => transaction.get(ref)));

    snaps.forEach((snap, index) => {
      if (!snap.exists) throw new Error("Product disappeared during checkout.");
      const data = snap.data() || {};
      const stock = Number(data.stock || 0);
      const quantity = items[index].quantity;
      const active = Boolean(data.active);
      if (!active) throw new Error("A product is no longer available.");
      if (stock < quantity) throw new Error(String(data.name || "Product") + " has only " + stock + " left.");
    });

    snaps.forEach((snap, index) => {
      const current = snap.data() || {};
      transaction.update(refs[index], {
        stock: Number(current.stock || 0) - items[index].quantity,
        updatedAt: new Date()
      });
    });

    transaction.update(db.collection("orders").doc(orderId), {
      inventoryReserved: true,
      inventoryReleased: false
    });
  });
}

export async function releaseInventory(db: Firestore, orderId: string) {
  await db.runTransaction(async transaction => {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) return;

    const order = orderSnap.data() || {};
    if (!order.inventoryReserved || order.inventoryReleased) return;

    const items = Array.isArray(order.items) ? order.items : [];
    const productRefs = items.map((item: { productId: string }) =>
      db.collection("products").doc(item.productId)
    );
    const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

    productSnaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const current = snap.data() || {};
      transaction.update(productRefs[index], {
        stock: Number(current.stock || 0) + Number(items[index].quantity || 0),
        updatedAt: new Date()
      });
    });

    transaction.update(orderRef, {
      inventoryReleased: true,
      inventoryReleasedAt: new Date()
    });
  });
}
