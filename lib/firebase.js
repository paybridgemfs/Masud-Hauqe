import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'gen-lang-client-0355052238',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:417373310388:web:99ef6fc775c8521a7cf6e1',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCyTmcQIVX3hZ7hDf4_VqVjDWxofFj6PwA',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0355052238.firebaseapp.com',
  firestoreDatabaseId:
    process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID ||
    'ai-studio-8b5d69b5-778d-48b9-b344-41c02ede975f',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'gen-lang-client-0355052238.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '417373310388',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const currentUser = auth?.currentUser;
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;
export async function testFirestoreConnection() {
  if (typeof window === 'undefined' || connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'artists', 'masud-hauqe'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testFirestoreConnection();
}

export async function syncEntityToFirestore(collectionName, docId, payload) {
  if (typeof window === 'undefined' || !auth?.currentUser) return;
  const path = `${collectionName}/${docId}`;
  try {
    await setDoc(doc(db, collectionName, docId), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEntityFromFirestore(collectionName, docId) {
  if (typeof window === 'undefined' || !auth?.currentUser) return;
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchCollectionFromFirestore(collectionName) {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}
