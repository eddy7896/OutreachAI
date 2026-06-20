'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import LeadForm from '@/components/leads/LeadForm';
import { useLeads } from '@/hooks/useLeads';
import { fetchOne } from '@/lib/firestore';
import { Lead } from '@/types';

export default function LeadEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const { addLead, updateLead } = useLeads();
  const [initialData, setInitialData] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isNew) return;

    const loadLead = async () => {
      try {
        const data = await fetchOne<Lead>('leads', id);
        if (!data) {
          setError('Lead not found');
        } else {
          setInitialData(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    loadLead();
  }, [id, isNew]);

  const handleSubmit = async (data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (isNew) {
        await addLead(data);
      } else {
        await updateLead(id, data);
      }
      router.push('/leads');
    } catch (err: any) {
      console.error(err);
      throw err;
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/leads')} sx={{ mb: 2 }}>
          Back to Leads
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/leads')} sx={{ mb: 2 }}>
          Back to Leads
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {isNew ? 'Add New Lead' : 'Edit Lead'}
        </Typography>
        <Typography color="text.secondary">
          Enter the lead's contact information and status.
        </Typography>
      </Box>

      <LeadForm 
        initialData={initialData || undefined} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/leads')}
      />
    </Box>
  );
}
