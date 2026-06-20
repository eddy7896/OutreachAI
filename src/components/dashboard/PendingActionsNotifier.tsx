'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Snackbar, Alert, Button, Box } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function PendingActionsNotifier() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // In MVP without cloud functions, we simulate checking for drafts that need to be sent manually
  useEffect(() => {
    // Check if browser notifications are allowed
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    // The simulated notification timer has been disabled to prevent annoying popups.
    // In the future, this should actually query Firestore for real drafts.
  }, []);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleAction = () => {
    setOpen(false);
    // Ideally router.push('/pending-sends') or /compose
  };

  return (
    <Snackbar 
      open={open} 
      autoHideDuration={10000} 
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert 
        onClose={handleClose} 
        severity="warning" 
        variant="filled"
        sx={{ width: '100%', alignItems: 'center' }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" size="small" onClick={handleAction}>
              VIEW
            </Button>
          </Box>
        }
      >
        You have pending emails to send (Cloud Function Fallback)
      </Alert>
    </Snackbar>
  );
}
