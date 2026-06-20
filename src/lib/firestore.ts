import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

// Generic helper to get a typed collection
export const getCollection = <T>(collectionName: string) => {
  return collection(db, collectionName);
};

// Generic fetch all
export const fetchAll = async <T>(collectionName: string, ...queryConstraints: QueryConstraint[]) => {
  const q = query(collection(db, collectionName), ...queryConstraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T));
};

// Generic fetch single
export const fetchOne = async <T>(collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

// Generic create
export const createDocument = async <T>(collectionName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
  const dataWithTimestamps = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, collectionName), dataWithTimestamps);
  return { id: docRef.id, ...dataWithTimestamps } as T;
};

// Generic update
export const updateDocument = async <T>(collectionName: string, id: string, data: Partial<T>) => {
  const docRef = doc(db, collectionName, id);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  // @ts-ignore - firestore types can be tricky with Partial
  await updateDoc(docRef, updateData);
};

// Generic delete
export const deleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};
