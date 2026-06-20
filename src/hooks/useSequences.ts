import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Sequence } from '@/types';
import { createDocument, updateDocument, deleteDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'sequences';

export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Sequence[];
        setSequences(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching sequences:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addSequence = async (sequenceData: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createDocument<Sequence>(COLLECTION_NAME, sequenceData);
  };

  const updateSequence = async (id: string, sequenceData: Partial<Sequence>) => {
    return updateDocument<Sequence>(COLLECTION_NAME, id, sequenceData);
  };

  const removeSequence = async (id: string) => {
    return deleteDocument(COLLECTION_NAME, id);
  };

  return {
    sequences,
    loading,
    error,
    addSequence,
    updateSequence,
    removeSequence,
  };
}
