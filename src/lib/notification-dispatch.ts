import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { sendNotification } from "@/lib/notifications";

export async function dispatchNotificationsForOrder(orderId: string) {
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
    // Notification failures must not change an already-verified payment result.
    console.error("Unable to dispatch notifications for order", orderId, error);
  }
}
