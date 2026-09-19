import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

const serverConfigured = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID &&
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
  process.env.FIREBASE_ADMIN_PRIVATE_KEY
);

function getAdminApp() {
  if (!serverConfigured) return null;

  if (getApps().length) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, "\n")
    })
  });
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export async function requireAdmin(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();

  if (!auth || !db) {
    throw new Error("Server Firebase Admin credentials are not configured.");
  }

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) throw new Error("Authentication required.");

  const decoded = await auth.verifyIdToken(token);
  const userSnap = await db.collection("users").doc(decoded.uid).get();

  if (!userSnap.exists || userSnap.data()?.role !== "admin") {
    throw new Error("Admin access required.");
  }

  return { uid: decoded.uid, user: decoded, db };
}

export async function optionalUser(request: Request) {
  const auth = getAdminAuth();
  if (!auth) return null;

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    return await auth.verifyIdToken(token);
  } catch {
    return null;
  }
}
