import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

function getEnv(name: string) {
  const value = process.env[name];
  return value?.trim() ? value.trim() : "";
}

const projectId = getEnv("FIREBASE_ADMIN_PROJECT_ID");
const clientEmail = getEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim() || "";

const serverConfigured = Boolean(projectId && clientEmail && privateKey);

let cachedApp: App | null = null;
let initError: string | null = null;

function getAdminApp(): App | null {
  if (!serverConfigured) return null;
  if (cachedApp) return cachedApp;

  try {
    const normalizedPrivateKey = privateKey.replace(/\\n/g, "\n");

    cachedApp = getApps().length
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: normalizedPrivateKey
          })
        });

    initError = null;
    return cachedApp;
  } catch (error) {
    initError = error instanceof Error ? error.message : "Firebase Admin initialization failed.";
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseAdminStatus() {
  getAdminApp();
  return {
    configured: serverConfigured,
    initialized: Boolean(cachedApp),
    error: initError
  };
}

export async function requireAdmin(request: Request) {
  const auth = getAdminAuth();
  const db = getAdminDb();

  if (!auth || !db) {
    throw new Error(initError || "Server Firebase Admin credentials are not configured.");
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
