import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firestore-utils';

export interface IntelligenceNode {
  userId: string;
  type: 'core' | 'willow' | 'gnome' | 'sycamoreG';
  data: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export const createIntelligenceNode = async (userId: string, type: IntelligenceNode['type'], data: any = {}) => {
    const path = `users/${userId}/intelligence`;
    try {
        const nodeRef = doc(collection(db, path));
        const newNode: IntelligenceNode = {
          userId,
          type,
          data,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        await setDoc(nodeRef, newNode);
        return nodeRef.id;
    } catch(error) {
        handleFirestoreError(error, OperationType.CREATE, path);
    }
}
