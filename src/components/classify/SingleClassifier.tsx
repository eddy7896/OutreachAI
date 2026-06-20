'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, TextField, Button, CircularProgress, Typography, Paper } from '@mui/material';
import IntentResultCard from './IntentResultCard';

export default function SingleClassifier() {
  const [emailText, setEmailText] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClassify = async () => {
    if (!emailText.trim()) return;

    setIsClassifying(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to classify email');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Paste Email Reply
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Paste an incoming cold email reply to analyze its intent.
        </Typography>
        
        <TextField
          fullWidth
          multiline
          rows={6}
          placeholder="e.g. Thanks for reaching out, but we already use a similar tool..."
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          onClick={handleClassify}
          disabled={!emailText.trim() || isClassifying}
          startIcon={isClassifying ? <CircularProgress size={20} /> : undefined}
        >
          {isClassifying ? 'Analyzing...' : 'Analyze Intent'}
        </Button>
      </Paper>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          Error: {error}
        </Typography>
      )}

      {result && <IntentResultCard result={result} />}
    </Box>
  );
}
