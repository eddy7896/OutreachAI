import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lead } from '@/types';
import { createDocument, updateDocument, deleteDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'leads';

export function useLeads(campaignId?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
    if (campaignId) {
      constraints.push(where('campaignId', '==', campaignId));
    }
    
    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Lead[];
        setLeads(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching leads:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [campaignId]);

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createDocument<Lead>(COLLECTION_NAME, leadData);
  };

  const updateLead = async (id: string, leadData: Partial<Lead>) => {
    return updateDocument<Lead>(COLLECTION_NAME, id, leadData);
  };

  const removeLead = async (id: string) => {
    return deleteDocument(COLLECTION_NAME, id);
  };

  return {
    leads,
    loading,
    error,
    addLead,
    updateLead,
    removeLead,
  };
}
