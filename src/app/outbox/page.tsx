'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress, Alert } from '@mui/material';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Email, Lead } from '@/types';
import { format } from 'date-fns';

interface OutboundEmail extends Email {
  lead?: Lead;
}

export default function OutboxPage() {
  const [emails, setEmails] = useState<OutboundEmail[]>([]);
  const [leads, setLeads] = useState<Record<string, Lead>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch leads map for quick lookup
    const leadsUnsubscribe = onSnapshot(collection(db, 'leads'), (snapshot) => {
      const leadsMap: Record<string, Lead> = {};
      snapshot.docs.forEach(doc => {
        leadsMap[doc.id] = { id: doc.id, ...doc.data() } as Lead;
      });
      setLeads(leadsMap);
    }, (err) => {
      console.error('Error fetching leads:', err);
    });

    // 2. Fetch outbound emails
    const q = query(
      collection(db, 'emails'),
      where('direction', '==', 'outbound')
    );
    
    const emailsUnsubscribe = onSnapshot(q, (snapshot) => {
      const emailData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutboundEmail));
      emailData.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt as any).toMillis() : 0;
        const timeB = b.createdAt ? (b.createdAt as any).toMillis() : 0;
        return timeB - timeA;
      });
      setEmails(emailData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching outbound emails:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => {
      leadsUnsubscribe();
      emailsUnsubscribe();
    };
  }, []);

  // Merge leads into emails
  const mergedEmails = emails.map(email => ({
    ...email,
    lead: leads[email.leadId]
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'opened': return 'success';
      case 'delivered': return 'info';
      case 'failed': return 'error';
      case 'bounced': return 'error';
      case 'sent': return 'primary';
      default: return 'default';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Outbox & Tracking</Typography>
        <Typography color="text.secondary">
          Monitor all sent emails and track their delivery and open statuses.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Recipient</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Company</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Sent Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Opened Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mergedEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No outbound emails found. Send an email to start tracking!
                  </TableCell>
                </TableRow>
              ) : (
                mergedEmails.map((email) => (
                  <TableRow key={email.id} hover>
                    <TableCell>
                      {email.lead ? `${email.lead.firstName} ${email.lead.lastName}` : 'Unknown Lead'}
                      <br/>
                      <Typography variant="caption" color="text.secondary">
                        {email.lead?.email || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>{email.lead?.company || 'N/A'}</TableCell>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell>
                      <Chip 
                        label={email.opened ? 'opened' : email.status} 
                        color={getStatusColor(email.opened ? 'opened' : email.status)} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatDate(email.createdAt)}</TableCell>
                    <TableCell>
                      {email.opened ? formatDate(email.openedAt) : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
