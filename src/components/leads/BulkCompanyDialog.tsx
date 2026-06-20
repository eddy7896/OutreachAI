'use client';

import * as React from 'react';
import { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  CircularProgress,
  Typography,
  Alert
} from '@mui/material';

interface BulkCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkCompanyDialog({ open, onClose, onSuccess }: BulkCompanyDialogProps) {
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!company.trim()) {
      setError('Please enter a company name or domain.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/enrich/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim() })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to bulk import');
      }

      if (data.importedCount > 0) {
        alert(`Successfully imported ${data.importedCount} leads from ${company}!`);
        onSuccess();
        handleClose();
      } else {
        setError(data.message || 'No employees found for this company.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompany('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Import by Company</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter a company domain (e.g., stripe.com) or name to automatically find up to 10 employees and import them as Leads.
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          autoFocus
          fullWidth
          label="Company Name or Domain"
          placeholder="e.g. apple.com"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          disabled={loading}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleImport();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          disabled={loading || !company.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {loading ? 'Importing...' : 'Search & Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
