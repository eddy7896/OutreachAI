'use client';

import * as React from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Chip, IconButton, Tooltip, useTheme, useMediaQuery, Box, Card, CardContent, Typography, Avatar, Divider } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Send as SendIcon, Email as EmailIcon, Business as BusinessIcon } from '@mui/icons-material';
import { Lead } from '@/types';
import { useRouter } from 'next/navigation';

interface LeadTableProps {
  leads: Lead[];
  onDelete: (id: string) => void;
  loading: boolean;
}

const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  new: 'info',
  contacted: 'primary',
  replied: 'secondary',
  qualified: 'success',
  lost: 'error',
  converted: 'success'
};

export default function LeadTable({ leads, onDelete, loading }: LeadTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First name', width: 130 },
    { field: 'lastName', headerName: 'Last name', width: 130 },
    { field: 'company', headerName: 'Company', width: 150 },
    { field: 'jobTitle', headerName: 'Job Title', width: 150 },
    { field: 'industry', headerName: 'Industry', width: 130 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'targetProduct', headerName: 'Target Product', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={statusColors[params.value as string] || 'default'} 
          size="small" 
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <Tooltip title="View/Edit">
            <IconButton size="small" onClick={() => router.push(`/leads/${params.row.id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send Email">
            <IconButton size="small" color="primary" onClick={() => router.push(`/compose?leadId=${params.row.id}`)}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  if (isMobile) {
    if (loading) return <Typography>Loading leads...</Typography>;
    if (leads.length === 0) return <Typography>No leads found.</Typography>;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {leads.map((lead) => (
          <Card key={lead.id} variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                    {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {lead.firstName} {lead.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <BusinessIcon fontSize="small" color="disabled" /> {lead.company}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={lead.status} 
                  color={statusColors[lead.status] || 'default'} 
                  size="small" 
                  sx={{ textTransform: 'capitalize' }}
                />
              </Box>
              
              <Divider sx={{ my: 1.5 }} />
              
              <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon fontSize="small" color="disabled" /> {lead.email}
              </Typography>
              
              {lead.jobTitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Title:</strong> {lead.jobTitle}
                </Typography>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => router.push(`/leads/${lead.id}`)}>
                  Edit
                </Button>
                <Button size="small" variant="contained" color="primary" startIcon={<SendIcon />} onClick={() => router.push(`/compose?leadId=${lead.id}`)}>
                  Email
                </Button>
                <IconButton size="small" color="error" onClick={() => onDelete(lead.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <div style={{ height: 600, width: '100%', backgroundColor: 'white', borderRadius: 8 }}>
      <DataGrid
        rows={leads}
        columns={columns}
        loading={loading}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
        pageSizeOptions={[5, 10, 25, 50]}
        checkboxSelection
        disableRowSelectionOnClick
      />
    </div>
  );
}
