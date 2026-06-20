'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { CloudUpload as CloudUploadIcon, Add as AddIcon } from '@mui/icons-material';
import { useLeads } from '@/hooks/useLeads';
import LeadTable from '@/components/leads/LeadTable';
import LeadImportDialog from '@/components/leads/LeadImportDialog';
import BulkCompanyDialog from '@/components/leads/BulkCompanyDialog';
import { Lead } from '@/types';
import { useRouter } from 'next/navigation';

export default function LeadsPage() {
  const router = useRouter();
  const { leads, loading, error, removeLead, addLead } = useLeads();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await removeLead(id);
      } catch (err: any) {
        console.error('Failed to delete lead', err);
      }
    }
  };

  const handleImport = async (parsedLeads: Partial<Lead>[]) => {
    setImportError(null);
    try {
      // In a real production app, we would batch this or send to a backend endpoint
      // For MVP, we insert sequentially or concurrently
      const promises = parsedLeads.map(lead => addLead(lead as Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>));
      await Promise.all(promises);
      
      // We could optionally trigger the /api/auto-format route here,
      // but to keep the upload fast, we'll let the AI compose route handle it later,
      // or we can just fetch and format in the background. 
      // Based on specs: "When leads are uploaded, the system auto-generates..."
      // To prevent massive rate limiting on upload, we can trigger background formatting
      // or just do it when they go to compose.
      // For now, let's just save them.
    } catch (err: any) {
      setImportError(err.message || 'Error importing leads');
      throw err; // re-throw so the dialog knows it failed
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Lead Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            Import Excel/CSV
          </Button>
          <Button
            variant="outlined"
            onClick={() => setBulkDialogOpen(true)}
          >
            Bulk Company Search
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => router.push('/leads/new')}
          >
            Add Lead
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading leads: {error.message}
        </Alert>
      )}
      
      {importError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Import Error: {importError}
        </Alert>
      )}

      <LeadTable leads={leads} loading={loading} onDelete={handleDelete} />

      <LeadImportDialog 
        open={importDialogOpen} 
        onClose={() => setImportDialogOpen(false)} 
        onImport={handleImport} 
      />

      <BulkCompanyDialog
        open={bulkDialogOpen}
        onClose={() => setBulkDialogOpen(false)}
        onSuccess={() => {
          // A full refresh or triggering useLeads refetch would go here.
          // For now, reloading the page is the simplest way to see the new data immediately
          window.location.reload();
        }}
      />
    </Box>
  );
}
