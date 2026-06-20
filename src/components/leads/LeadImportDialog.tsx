'use client';

import * as React from 'react';
import { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Alert,
  List, ListItem, ListItemText, Divider
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { parseExcelFile } from '@/utils/excelParser';
import { Lead } from '@/types';

interface LeadImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (leads: Partial<Lead>[]) => Promise<void>;
}

export default function LeadImportDialog({ open, onClose, onImport }: LeadImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewLeads, setPreviewLeads] = useState<Partial<Lead>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setError(null);
    if (!selectedFile) return;

    setFile(selectedFile);
    try {
      const leads = await parseExcelFile(selectedFile);
      setPreviewLeads(leads);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file. Make sure it is a valid Excel/CSV file.');
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (previewLeads.length === 0) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      await onImport(previewLeads);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import leads');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewLeads([]);
    setError(null);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Leads</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {!file ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>Click to upload Excel or CSV</Typography>
            <Typography variant="body2" color="text.secondary">
              Expected columns: Target Product, Industry, First Name, Last Name, Company, Job Title, Email, Phone Number, Remarks
            </Typography>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Preview: Found {previewLeads.length} leads
            </Typography>
            <List sx={{ maxHeight: 300, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {previewLeads.slice(0, 5).map((lead, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText 
                      primary={`${lead.firstName || ''} ${lead.lastName || ''} - ${lead.email}`}
                      secondary={`${lead.company || 'Unknown Company'} | ${lead.targetProduct || 'No product specified'}`}
                    />
                  </ListItem>
                  {index < Math.min(previewLeads.length - 1, 4) && <Divider />}
                </React.Fragment>
              ))}
              {previewLeads.length > 5 && (
                <ListItem>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', width: '100%', textAlign: 'center' }}>
                    ...and {previewLeads.length - 5} more
                  </Typography>
                </ListItem>
              )}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isProcessing}>Cancel</Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          disabled={!file || isProcessing || previewLeads.length === 0}
          startIcon={isProcessing ? <CircularProgress size={20} /> : undefined}
        >
          {isProcessing ? 'Importing...' : `Import ${previewLeads.length} Leads`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
