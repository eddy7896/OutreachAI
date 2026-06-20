'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, TextField, Button, Grid, IconButton, Typography, Paper, Alert } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { Product } from '@/types';

interface ProductFormProps {
  initialData?: Partial<Product>;
  onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  isSubmitting: boolean;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSubmit, isSubmitting, onCancel }: ProductFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [valueProposition, setValueProposition] = useState(initialData?.valueProposition || '');
  const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || '');
  const [competitorDifferentiators, setCompetitorDifferentiators] = useState(initialData?.competitorDifferentiators || '');
  const [keyFeatures, setKeyFeatures] = useState<string[]>(initialData?.keyFeatures?.length ? initialData.keyFeatures : ['']);
  const [error, setError] = useState<string | null>(null);

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...keyFeatures];
    newFeatures[index] = value;
    setKeyFeatures(newFeatures);
  };

  const addFeature = () => {
    setKeyFeatures([...keyFeatures, '']);
  };

  const removeFeature = (index: number) => {
    if (keyFeatures.length === 1) return;
    const newFeatures = keyFeatures.filter((_, i) => i !== index);
    setKeyFeatures(newFeatures);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !description || !valueProposition || !targetAudience) {
      setError('Please fill in all required fields.');
      return;
    }

    const cleanedFeatures = keyFeatures.filter(f => f.trim() !== '');

    try {
      await onSubmit({
        name,
        description,
        valueProposition,
        targetAudience,
        competitorDifferentiators,
        keyFeatures: cleanedFeatures,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <TextField
              fullWidth
              label="Product Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Detailed Description"
              required
              multiline
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              helperText="Provide detailed context for the AI to understand what this product/service does."
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" gutterBottom>Sales Context</Typography>
            <TextField
              fullWidth
              label="Value Proposition"
              required
              multiline
              rows={3}
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              sx={{ mb: 2 }}
              helperText="The core benefit or problem it solves."
            />
            <TextField
              fullWidth
              label="Target Audience"
              required
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              sx={{ mb: 2 }}
              helperText="e.g., Marketing Managers at B2B SaaS companies"
            />
            <TextField
              fullWidth
              label="Competitor Differentiators"
              multiline
              rows={3}
              value={competitorDifferentiators}
              onChange={(e) => setCompetitorDifferentiators(e.target.value)}
              helperText="How it's better than alternatives (used by AI to handle objections)."
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6" gutterBottom>Key Features</Typography>
            {keyFeatures.map((feature, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label={`Feature ${index + 1}`}
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  size="small"
                />
                <IconButton 
                  color="error" 
                  onClick={() => removeFeature(index)}
                  disabled={keyFeatures.length === 1}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={addFeature} variant="outlined" size="small">
              Add Feature
            </Button>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Product'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}
