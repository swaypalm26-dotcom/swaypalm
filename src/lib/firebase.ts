import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  enableNetwork,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  getFriendlyNetworkErrorMessage,
  isNetworkError,
  isPermissionError,
  reportNetworkHealthy,
  reportNetworkIssue,
} from './network';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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

export function handleFirestoreActionError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  onNetworkIssue?: (friendlyMessage: string) => void
): false {
  if (!isPermissionError(error) && isNetworkError(error)) {
    const friendly = getFriendlyNetworkErrorMessage(
      error,
      'Network connection interrupted while syncing data. Please check your connection and retry.'
    );
    console.warn(`Firestore network error (${operationType} ${path || ''}):`, error);
    reportNetworkIssue(friendly);
    onNetworkIssue?.(friendly);
    return false;
  }
  handleFirestoreError(error, operationType, path);
}

export async function checkFirestoreConnection(
  forceEnableNetwork = false
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (forceEnableNetwork) {
      await enableNetwork(db);
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
    reportNetworkHealthy();
    return { ok: true };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
    if (isNetworkError(error)) {
      const friendly = getFriendlyNetworkErrorMessage(
        error,
        'Unable to reach SwayPalm database. Check your internet connection.'
      );
      reportNetworkIssue(friendly);
      return { ok: false, error: friendly };
    }
    return { ok: true };
  }
}

async function testConnection() {
  await checkFirestoreConnection(false);
}

void testConnection();
