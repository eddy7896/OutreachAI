'use client';

import * as React from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Chip, IconButton, Tooltip } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Send as SendIcon } from '@mui/icons-material';
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
