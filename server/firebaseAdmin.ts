import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'gen-lang-client-0504713936';
const DATABASE_ID = 'ai-studio-ddb6caff-168f-4ec5-bd05-da5d7d64fc04';

function initializeFirebaseAdmin() {
  const existing = getApps().find((app) => app.name === 'berry-admin');

  if (existing) return existing;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const credential = serviceAccountJson
    ? cert(JSON.parse(serviceAccountJson))
    : applicationDefault();

  return initializeApp(
    {
      credential,
      projectId: PROJECT_ID,
    },
    'berry-admin',
  );
}

let initializationError: unknown;

try {
  initializeFirebaseAdmin();
} catch (error) {
  initializationError = error;
  console.error(
    'Firebase Admin initialization failed. Protected Firebase services will remain unavailable.',
    error instanceof Error ? error.message : 'Unknown initialization error',
  );
}

const adminApp = getApps().find((app) => app.name === 'berry-admin');

export const adminAuth = adminApp ? getAuth(adminApp) : null;

export const adminDb = adminApp
  ? getFirestore(adminApp, DATABASE_ID)
  : null;

export const isFirebaseAdminReady = Boolean(adminAuth && adminDb);

export function getFirebaseAdminInitializationError() {
  return initializationError;
}
