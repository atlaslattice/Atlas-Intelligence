import { collection, doc, setDoc, getDocs, onSnapshot, query, where, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase-app';
export { db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Memory Functions
export interface MemoryEntry {
  id?: string;
  userId: string;
  content: string;
  tier: 'volatile' | 'working' | 'canonical';
  tags?: string[];
  metadata?: Record<string, any>;
  houseId?: string;
  sphereId?: string;
  createdAt: number;
  supersededBy?: string;
  supersedes?: string;
  convenorTokenId?: string;
  confidenceTier: 'VERIFIED' | 'DESIGN_CHOICE' | 'CREATIVE_OVERLAY' | 'NOT_VERIFIED';
}

export const issueConvenorToken = async (userId: string) => {
    const path = `users/${userId}/convenor_tokens`;
    try {
        const tokenRef = doc(collection(db, path));
        await setDoc(tokenRef, {
            userId,
            expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
        });
        return tokenRef.id;
    } catch(error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
}

export const saveMemory = async (userId: string, entry: MemoryEntry, convenorTokenId?: string) => {
    const path = `users/${userId}/memories`;
    try {
        if (entry.tier === 'canonical') {
            if (!convenorTokenId) {
                throw new Error("Canonical writes require a convenor token.");
            }
            entry.convenorTokenId = convenorTokenId;
            const batch = writeBatch(db);
            const memoryRef = doc(collection(db, path));
            batch.set(memoryRef, { ...entry, createdAt: Date.now() });
            
            const tokenPath = `users/${userId}/convenor_tokens/${convenorTokenId}`;
            const tokenRef = doc(db, tokenPath);
            batch.delete(tokenRef);
            
            await batch.commit();
            return memoryRef.id;
        } else {
            const memoryRef = doc(collection(db, path));
            await setDoc(memoryRef, { ...entry, createdAt: Date.now() });
            return memoryRef.id;
        }
    } catch(error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
}
