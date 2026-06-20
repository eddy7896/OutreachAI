import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Campaign } from '@/types';
import { createDocument, updateDocument, deleteDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'campaigns';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
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
        })) as Campaign[];
        setCampaigns(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching campaigns:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addCampaign = async (campaignData: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => {
    return createDocument<Campaign>(COLLECTION_NAME, {
      ...campaignData,
      stats: { totalLeads: 0, sent: 0, replied: 0, positive: 0, notInterested: 0, bounced: 0, ghosted: 0 }
    });
  };

  const updateCampaign = async (id: string, campaignData: Partial<Campaign>) => {
    return updateDocument<Campaign>(COLLECTION_NAME, id, campaignData);
  };

  const removeCampaign = async (id: string) => {
    return deleteDocument(COLLECTION_NAME, id);
  };

  return {
    campaigns,
    loading,
    error,
    addCampaign,
    updateCampaign,
    removeCampaign,
  };
}
