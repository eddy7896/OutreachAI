'use client';

import * as React from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    return onAuthStateChanged(getClientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    // `hd` only pre-filters Google's account picker; the server enforces the domain.
    const hostedDomain = process.env.NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN;
    provider.setCustomParameters({ prompt: 'select_account', ...(hostedDomain ? { hd: hostedDomain } : {}) });

    const credential = await signInWithPopup(auth, provider);
    const idToken = await credential.user.getIdToken();
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      await firebaseSignOut(auth); // don't keep a client session the server refused
      throw new Error(data.error || 'Sign-in failed');
    }
  }, []);

  const signOut = React.useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => undefined);
    await firebaseSignOut(getClientAuth()).catch(() => undefined);
    window.location.assign('/login');
  }, []);

  const value = React.useMemo(() => ({ user, loading, signInWithGoogle, signOut }), [user, loading, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
