import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Email } from '@/types';

const COLLECTION_NAME = 'emails';

export function useEmails(campaignId?: string) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    
    if (campaignId) {
      q = query(
        collection(db, COLLECTION_NAME), 
        where('campaignId', '==', campaignId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Email[];
        setEmails(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching emails:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [campaignId]);

  return {
    emails,
    loading,
    error,
  };
}
