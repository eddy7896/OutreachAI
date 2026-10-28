'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '@/components/auth/AuthProvider';
import { safeNextPath } from '@/lib/auth/config';

function LoginForm() {
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
      // Full navigation so the proxy sees the new session cookie.
      window.location.assign(safeNextPath(searchParams.get('next')));
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      }
      setSigningIn(false);
    }
  };

  return (
    <Paper sx={{ p: 5, maxWidth: 420, width: '100%', textAlign: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
        Outreach AI
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Sign in with your company Google account.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={signingIn ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
        onClick={handleSignIn}
        disabled={signingIn}
      >
        {signingIn ? 'Signing in…' : 'Sign in with Google'}
      </Button>
    </Paper>
  );
}

export default function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: 'background.default' }}>
      {/* useSearchParams needs a Suspense boundary for static prerendering */}
      <Suspense fallback={<CircularProgress />}>
        <LoginForm />
      </Suspense>
    </Box>
  );
}
