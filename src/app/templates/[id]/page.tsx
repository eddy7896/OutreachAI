'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import TemplateEditor from '@/components/templates/TemplateEditor';
import { useTemplates } from '@/hooks/useTemplates';
import { fetchOne } from '@/lib/firestore';
import { EmailTemplate } from '@/types';

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';
  const searchParams = useSearchParams();
  const preset = searchParams.get('preset');

  const { addTemplate, updateTemplate } = useTemplates();
  const [initialData, setInitialData] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;

    const loadTemplate = async () => {
      try {
        const data = await fetchOne<EmailTemplate>('templates', id);
        if (!data) {
          setError('Template not found');
        } else {
          setInitialData(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [id, isNew]);

  const handleSubmit = async (data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (isNew) {
        await addTemplate(data);
      } else {
        await updateTemplate(id, data);
      }
      router.push('/templates');
    } catch (err: any) {
      console.error(err);
      throw err; // Form will catch and display it
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/templates')} sx={{ mb: 2 }}>
          Back to Templates
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/templates')} sx={{ mb: 2 }}>
          Back to Templates
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {isNew ? 'Create New Template' : 'Edit Template'}
        </Typography>
        <Typography color="text.secondary">
          Design your email structure using dynamic placeholders.
        </Typography>
      </Box>

      <TemplateEditor 
        initialData={initialData || undefined} 
        preset={preset || undefined}
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/templates')}
      />
    </Box>
  );
}
