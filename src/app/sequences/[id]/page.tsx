'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import SequenceBuilder from '@/components/sequences/SequenceBuilder';
import { useSequences } from '@/hooks/useSequences';
import { useTemplates } from '@/hooks/useTemplates';
import { fetchOne } from '@/lib/firestore';
import { Sequence } from '@/types';

export default function SequenceEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const { addSequence, updateSequence } = useSequences();
  const { templates, loading: templatesLoading } = useTemplates();
  const [initialData, setInitialData] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;

    const loadSequence = async () => {
      try {
        const data = await fetchOne<Sequence>('sequences', id);
        if (!data) {
          setError('Sequence not found');
        } else {
          setInitialData(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load sequence');
      } finally {
        setLoading(false);
      }
    };

    loadSequence();
  }, [id, isNew]);

  const handleSubmit = async (data: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (isNew) {
        await addSequence(data);
      } else {
        await updateSequence(id, data);
      }
      router.push('/sequences');
    } catch (err: any) {
      console.error(err);
      throw err; // Form will catch and display it
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || templatesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/sequences')} sx={{ mb: 2 }}>
          Back to Sequences
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/sequences')} sx={{ mb: 2 }}>
          Back to Sequences
        </Button>
        <Typography variant="h4" fontWeight="bold">
          {isNew ? 'Create New Sequence' : 'Edit Sequence'}
        </Typography>
        <Typography color="text.secondary">
          Build automated follow-up paths.
        </Typography>
      </Box>

      <SequenceBuilder 
        initialData={initialData || undefined} 
        templates={templates}
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/sequences')}
      />
    </Box>
  );
}
