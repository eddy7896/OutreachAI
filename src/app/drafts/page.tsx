'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Delete as DeleteIcon, Edit as EditIcon, Send as SendIcon } from '@mui/icons-material';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Email, Lead } from '@/types';
import { useLeads } from '@/hooks/useLeads';
import { useRouter } from 'next/navigation';

export default function DraftsPage() {
  const router = useRouter();
  const { leads, loading: leadsLoading } = useLeads();
  const [drafts, setDrafts] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'emails'),
      where('status', '==', 'draft')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Email));
      // Sort by createdAt descending
      data.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt as any).toMillis() : 0;
        const timeB = b.createdAt ? (b.createdAt as any).toMillis() : 0;
        return timeB - timeA;
      });
      setDrafts(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this draft?')) {
      try {
        await deleteDoc(doc(db, 'emails', id));
      } catch (err) {
        console.error('Failed to delete draft', err);
        alert('Failed to delete draft');
      }
    }
  };

  const columns: GridColDef[] = [
    { 
      field: 'recipient', 
      headerName: 'Recipient', 
      width: 200,
      renderCell: (params: GridRenderCellParams) => {
        const lead = leads.find(l => l.id === params.row.leadId);
        return lead ? `${lead.firstName} ${lead.lastName}` : 'Unknown Lead';
      }
    },
    { 
      field: 'company', 
      headerName: 'Company', 
      width: 150,
      renderCell: (params: GridRenderCellParams) => {
        const lead = leads.find(l => l.id === params.row.leadId);
        return lead?.company || '-';
      }
    },
    { field: 'subject', headerName: 'Subject', width: 300 },
    { 
      field: 'createdAt', 
      headerName: 'Saved On', 
      width: 180,
      renderCell: (params: GridRenderCellParams) => {
        if (!params.value) return 'Unknown';
        return new Date((params.value as any).toMillis()).toLocaleString();
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <Tooltip title="Edit / Send">
            <IconButton color="primary" onClick={() => router.push(`/compose?draftId=${params.row.id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  if (leadsLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Drafts</Typography>
      </Box>

      <Paper sx={{ width: '100%', height: 600 }}>
        <DataGrid
          rows={drafts}
          columns={columns}
          loading={loading}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Paper>
    </Box>
  );
}
