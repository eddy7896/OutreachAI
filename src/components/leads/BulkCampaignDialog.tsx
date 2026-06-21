'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import { collection, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Campaign } from '@/types';

interface BulkCampaignDialogProps {
  open: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  onSuccess: () => void;
}

export default function BulkCampaignDialog({ open, onClose, selectedLeadIds, onSuccess }: BulkCampaignDialogProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignId, setCampaignId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = query(collection(db, 'campaigns'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
      setCampaigns(data.filter(c => c.status === 'active' || c.status === 'draft'));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load campaigns');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [open]);

  const handleSubmit = async () => {
    if (!campaignId) {
      setError('Please select a campaign');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const promises = selectedLeadIds.map(id => 
        updateDoc(doc(db, 'leads', id), { campaignId })
      );
      await Promise.all(promises);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update leads');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign to Campaign</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {loading ? (
          <CircularProgress />
        ) : (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Select Campaign</InputLabel>
            <Select
              value={campaignId}
              label="Select Campaign"
              onChange={(e) => setCampaignId(e.target.value)}
            >
              {campaigns.map(c => (
                 <MenuItem key={c.id} value={c.id}>{c.name} ({c.status})</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting || !campaignId}>
          {submitting ? 'Assigning...' : `Assign ${selectedLeadIds.length} Leads`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
