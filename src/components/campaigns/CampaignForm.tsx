'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, FormControl, InputLabel, Select, MenuItem, Alert, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
import { Campaign, Product, EmailTemplate, Sequence } from '@/types';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

const TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC'
];

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
  
  const [timezone, setTimezone] = useState(initialData?.timezone || 'America/New_York');
  const [startHour, setStartHour] = useState(initialData?.scheduleWindow?.startHour ?? 9);
  const [endHour, setEndHour] = useState(initialData?.scheduleWindow?.endHour ?? 17);
  const [days, setDays] = useState<number[]>(initialData?.scheduleWindow?.days || [1, 2, 3, 4, 5]);

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
        timezone,
        scheduleWindow: { startHour, endHour, days },
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

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Scheduling & Timezone</Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Timezone</InputLabel>
            <Select
              value={timezone}
              label="Timezone"
              onChange={(e) => setTimezone(e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <MenuItem key={tz} value={tz}>{tz}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Sending Days</InputLabel>
            <Select
              multiple
              value={days}
              onChange={(e) => setDays(typeof e.target.value === 'string' ? e.target.value.split(',').map(Number) : e.target.value as number[])}
              input={<OutlinedInput label="Sending Days" />}
              renderValue={(selected) => selected.map(val => DAYS_OF_WEEK.find(d => d.value === val)?.label.substring(0, 3)).join(', ')}
            >
              {DAYS_OF_WEEK.map((day) => (
                <MenuItem key={day.value} value={day.value}>
                  <Checkbox checked={days.indexOf(day.value) > -1} />
                  <ListItemText primary={day.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <FormControl fullWidth>
            <InputLabel>Start Time (Hour 0-23)</InputLabel>
            <Select
              value={startHour}
              label="Start Time (Hour 0-23)"
              onChange={(e) => setStartHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <MenuItem key={i} value={i}>{i === 0 ? 'Midnight' : i < 12 ? `${i} AM` : i === 12 ? 'Noon' : `${i-12} PM`}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>End Time (Hour 0-23)</InputLabel>
            <Select
              value={endHour}
              label="End Time (Hour 0-23)"
              onChange={(e) => setEndHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <MenuItem key={i} value={i}>{i === 0 ? 'Midnight' : i < 12 ? `${i} AM` : i === 12 ? 'Noon' : `${i-12} PM`}</MenuItem>
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
