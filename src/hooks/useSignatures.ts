import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Signature } from '@/types';

export function useSignatures() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'signatures'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Signature[];
        setSignatures(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching signatures:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const removeSignature = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'signatures', id));
    } catch (err) {
      console.error("Error deleting signature:", err);
      throw err;
    }
  };

  const setDefaultSignature = async (id: string) => {
    try {
      // First, find current default and unset it
      const currentDefault = signatures.find(s => s.isDefault);
      if (currentDefault && currentDefault.id !== id) {
        await updateDoc(doc(db, 'signatures', currentDefault.id), { isDefault: false });
      }
      // Set the new default
      await updateDoc(doc(db, 'signatures', id), { isDefault: true });
    } catch (err) {
      console.error("Error setting default signature:", err);
      throw err;
    }
  }

  return { signatures, loading, error, removeSignature, setDefaultSignature };
}
