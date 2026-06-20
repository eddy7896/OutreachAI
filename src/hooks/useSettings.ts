import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppSettings } from '@/types';
import { updateDocument } from '@/lib/firestore';

const COLLECTION_NAME = 'settings';
const DEFAULT_SETTINGS_ID = 'global';

const defaultSettings: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  profile: {
    name: 'Admin User',
    email: 'admin@example.com',
    company: 'Acme Corp',
  },
  preferences: {
    emailAlerts: true,
    inAppNotifications: true,
  },
  apiKeys: {
    resendApiKey: '',
    geminiApiKey: '',
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const docRef = doc(db, COLLECTION_NAME, DEFAULT_SETTINGS_ID);
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings({ id: docSnap.id, ...docSnap.data() } as AppSettings);
        } else {
          // Initialize default settings if they don't exist
          const initSettings = async () => {
            const newSettings = {
              ...defaultSettings,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            await setDoc(docRef, newSettings);
            setSettings({ id: DEFAULT_SETTINGS_ID, ...newSettings } as AppSettings);
          };
          initSettings();
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching settings:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSettings = async (settingsData: Partial<AppSettings>) => {
    if (!settings) return;
    
    // For nested objects we'd normally want to do deep merges or specific field paths in Firestore,
    // but for simplicity we'll just merge the top-level objects if provided.
    // e.g. updateDocument('settings', 'global', { 'profile.name': 'New Name' }) is safer for deep updates.
    
    return updateDocument(COLLECTION_NAME, DEFAULT_SETTINGS_ID, settingsData);
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
  };
}
