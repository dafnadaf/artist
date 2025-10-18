/* eslint-env node */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKeyEnv = process.env.FIREBASE_PRIVATE_KEY;

const privateKey = typeof privateKeyEnv === "string" ? privateKeyEnv.replace(/\\n/g, "\n") : undefined;

if (!getApps().length && projectId && clientEmail && privateKey) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const isFirebaseAdminConfigured = () => getApps().length > 0;

const getFirebaseAuth = () => {
  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase admin is not configured");
  }

  return getAuth();
};

export { getFirebaseAuth, isFirebaseAdminConfigured };
