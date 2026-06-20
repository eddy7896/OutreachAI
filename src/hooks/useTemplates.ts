import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmailTemplate } from '@/types';
import { createDocument, updateDocument, deleteDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'templates';

export function useTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
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
        })) as EmailTemplate[];
        setTemplates(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching templates:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createDocument<EmailTemplate>(COLLECTION_NAME, templateData);
  };

  const updateTemplate = async (id: string, templateData: Partial<EmailTemplate>) => {
    return updateDocument<EmailTemplate>(COLLECTION_NAME, id, templateData);
  };

  const removeTemplate = async (id: string) => {
    return deleteDocument(COLLECTION_NAME, id);
  };

  return {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    removeTemplate,
  };
}
