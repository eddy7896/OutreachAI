'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, FormControl, InputLabel, Select, MenuItem, Alert } from '@mui/material';
import { Campaign, Product, EmailTemplate, Sequence } from '@/types';

interface CampaignFormProps {
  initialData?: Partial<Campaign>;
  products: Product[];
  templates: EmailTemplate[];
  sequences: Sequence[];
  onSubmit: (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function CampaignForm({ initialData, products, templates, sequences, onSubmit, isSubmitting, onCancel }: CampaignFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [targetProduct, setTargetProduct] = useState(initialData?.targetProduct || '');
  const [industry, setIndustry] = useState(initialData?.industry || '');
  const [templateId, setTemplateId] = useState(initialData?.templateId || '');
  const [sequenceId, setSequenceId] = useState(initialData?.sequenceId || '');
  const [status, setStatus] = useState<Campaign['status']>(initialData?.status || 'draft');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !description || !targetProduct) {
      setError('Please fill in required fields.');
      return;
    }

    try {
      await onSubmit({
        name,
        description,
        targetProduct,
        industry,
        templateId,
        sequenceId,
        status,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign');
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>Campaign Settings</Typography>
        
        <TextField
          fullWidth
          label="Campaign Name *"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 3 }}
        />
        
        <TextField
          fullWidth
          label="Description *"
          required
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Target Product *</InputLabel>
            <Select
              value={targetProduct}
              label="Target Product *"
              onChange={(e) => setTargetProduct(e.target.value)}
              required
            >
              {products.map(p => (
                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Target Industry (Optional)"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            helperText="To filter leads"
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Outreach Strategy</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Initial Email Template</InputLabel>
            <Select
              value={templateId}
              label="Initial Email Template"
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <MenuItem value=""><em>None (Manual or Sequence only)</em></MenuItem>
              {templates.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Follow-up Sequence</InputLabel>
            <Select
              value={sequenceId}
              label="Follow-up Sequence"
              onChange={(e) => setSequenceId(e.target.value)}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {sequences.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <FormControl fullWidth sx={{ mb: 4, width: '50%' }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={status}
            label="Status"
            onChange={(e) => setStatus(e.target.value as Campaign['status'])}
          >
            <MenuItem value="draft">Draft</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="paused">Paused</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Campaign'}
          </Button>
        </Box>
      </form>
    </Paper>
  );
}
