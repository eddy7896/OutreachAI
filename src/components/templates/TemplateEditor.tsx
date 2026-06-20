'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, TextField, Button, Paper, Typography, MenuItem, Select, FormControl, InputLabel, Alert, Snackbar } from '@mui/material';
import PlaceholderChips from './PlaceholderChips';
import { EmailTemplate } from '@/types';

interface TemplateEditorProps {
  initialData?: Partial<EmailTemplate>;
  onSubmit: (data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function TemplateEditor({ initialData, onSubmit, isSubmitting, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [category, setCategory] = useState<EmailTemplate['category']>(initialData?.category || 'cold_outreach');
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handlePlaceholderSelect = (placeholder: string) => {
    // We copy it to clipboard for the user to paste into the text area
    // since building a full rich text editor with native insertion is complex for MVP
    navigator.clipboard.writeText(placeholder);
    setSnackbarOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !subject || !body) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      await onSubmit({
        name,
        subject,
        body,
        category,
        placeholders: [], // We resolve dynamically
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Template Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value as EmailTemplate['category'])}
            >
              <MenuItem value="cold_outreach">Cold Outreach</MenuItem>
              <MenuItem value="follow_up">Follow Up</MenuItem>
              <MenuItem value="breakup">Breakup / Final</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="h6" gutterBottom>Content</Typography>
        <PlaceholderChips onSelect={handlePlaceholderSelect} />
        
        <TextField
          fullWidth
          label="Email Subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          label="Email Body (HTML/Text)"
          required
          multiline
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          sx={{ mb: 3 }}
          helperText="You can use HTML tags like <p>, <br>, <strong> for formatting."
        />

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Template'}
          </Button>
        </Box>
      </form>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="Placeholder copied to clipboard"
      />
    </Paper>
  );
}
