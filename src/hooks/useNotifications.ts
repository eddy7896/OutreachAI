import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppNotification } from '@/types';
import { createDocument, updateDocument, deleteDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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
        })) as AppNotification[];
        setNotifications(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notifications:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    return updateDocument(COLLECTION_NAME, id, { isRead: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      const docRef = doc(db, COLLECTION_NAME, n.id);
      batch.update(docRef, { isRead: true });
    });
    
    await batch.commit();
  };

  const addNotification = async (notifData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    return createDocument<AppNotification>(COLLECTION_NAME, {
      ...notifData,
      isRead: false
    });
  };

  return {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    addNotification,
  };
}
