'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, Button, Typography, Paper, CircularProgress, Alert, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

interface BulkResult {
  email: string;
  intent: string;
  summary: string;
  action_required: boolean;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  error?: string;
}

export default function BulkClassifier() {
  // In a real app, we'd parse CSV to get multiple emails.
  // For MVP, we'll just allow pasting multiple emails separated by a delimiter, 
  // or just demonstrate the UI flow.
  const [emails, setEmails] = useState<string[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated file upload for now
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In production, parse CSV. For now, mock some data.
    const mockEmails = [
      "Thanks, but we already use a competitor.",
      "Can you send pricing?",
      "Out of office until next week."
    ];
    setEmails(mockEmails);
    setResults(mockEmails.map(email => ({
      email,
      intent: '',
      summary: '',
      action_required: false,
      status: 'pending'
    })));
  };

  const processAll = async () => {
    setIsProcessing(true);
    
    // Process sequentially to avoid rate limits on free Gemini tier
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'success') continue;
      
      // Update status to analyzing
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'analyzing' } : r));
      
      try {
        const response = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailText: results[i].email }),
        });
        
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'success',
          intent: data.intent,
          summary: data.summary,
          action_required: data.action_required
        } : r));
        
      } catch (err: any) {
        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'error',
          error: err.message
        } : r));
      }
    }
    
    setIsProcessing(false);
  };

  return (
    <Box>
      <Paper sx={{ p: 4, textAlign: 'center', mb: 4, border: '2px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>Upload CSV of Email Replies</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Upload a spreadsheet containing a column of email bodies to classify them in bulk.
        </Typography>
        <Button variant="contained" component="label">
          Select CSV File
          <input type="file" hidden accept=".csv" onChange={handleFileUpload} />
        </Button>
      </Paper>

      {results.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Found {results.length} Emails</Typography>
            <Button 
              variant="contained" 
              onClick={processAll} 
              disabled={isProcessing || results.every(r => r.status === 'success')}
            >
              {isProcessing ? 'Processing...' : 'Classify All'}
            </Button>
          </Box>
          
          <List>
            {results.map((r, idx) => (
              <React.Fragment key={idx}>
                <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '60%' }}>
                      "{r.email}"
                    </Typography>
                    <Box>
                      {r.status === 'pending' && <Chip label="Pending" size="small" />}
                      {r.status === 'analyzing' && <Chip label="Analyzing..." color="info" size="small" icon={<CircularProgress size={12} />} />}
                      {r.status === 'error' && <Chip label="Error" color="error" size="small" />}
                      {r.status === 'success' && <Chip label={r.intent} color={r.action_required ? 'primary' : 'default'} size="small" />}
                    </Box>
                  </Box>
                  {r.status === 'success' && (
                    <Typography variant="body2" color="text.primary">
                      ↳ {r.summary}
                    </Typography>
                  )}
                  {r.status === 'error' && (
                    <Typography variant="body2" color="error">
                      ↳ {r.error}
                    </Typography>
                  )}
                </ListItem>
                {idx < results.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}
