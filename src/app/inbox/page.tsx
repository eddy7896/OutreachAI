'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  TextField,
  Button,
  CircularProgress,
  Badge,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Lead, Email } from '@/types';
import { RichTextToolbar } from '@/components/ui/RichTextToolbar';

export default function InboxPage() {
  const [repliedLeads, setRepliedLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [thread, setThread] = useState<Email[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  
  const unreadRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch leads that have replied
  useEffect(() => {
    const q = query(collection(db, 'leads'), where('status', 'in', ['replied', 'qualified']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setRepliedLeads(leadsData);
      setLoadingLeads(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch thread when a lead is selected
  useEffect(() => {
    if (!selectedLeadId) {
      setThread([]);
      return;
    }
    const q = query(
      collection(db, 'emails'),
      where('leadId', '==', selectedLeadId)
      // Note: We'd normally use orderBy('createdAt', 'asc') here, but Firestore requires a composite index
      // for where() + orderBy() on different fields. We will fetch and sort in memory for simplicity.
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emailsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Email));
      // Sort in memory by createdAt
      emailsData.sort((a, b) => {
        const timeA = a.createdAt ? (a.createdAt as any).toMillis() : 0;
        const timeB = b.createdAt ? (b.createdAt as any).toMillis() : 0;
        return timeA - timeB;
      });
      setThread(emailsData);
    });
    return () => unsubscribe();
  }, [selectedLeadId]);

  // 3. Handle unread scrolling and marking as read
  useEffect(() => {
    if (thread.length > 0 && selectedLeadId) {
      const hasUnread = thread.some(m => m.direction === 'inbound' && m.isRead === false);
      
      // Auto-scroll to unread boundary
      if (hasUnread && unreadRef.current) {
        setTimeout(() => {
          unreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }

      // Mark as read in Firestore after a short delay
      if (hasUnread) {
        const timer = setTimeout(async () => {
          try {
            // Update Lead
            const lead = repliedLeads.find(l => l.id === selectedLeadId);
            if (lead && lead.hasUnread) {
              const leadRef = doc(db, 'leads', lead.id);
              await updateDoc(leadRef, { hasUnread: false });
            }
            
            // Update unread Emails
            const unreadEmails = thread.filter(m => m.direction === 'inbound' && m.isRead === false);
            for (const msg of unreadEmails) {
              const emailRef = doc(db, 'emails', msg.id);
              await updateDoc(emailRef, { isRead: true });
            }
          } catch (e) {
            console.error('Failed to mark as read', e);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [thread, selectedLeadId, repliedLeads]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedLeadId) return;
    setSending(true);

    const lead = repliedLeads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    try {
      // Create outbound email document
      const newEmailRef = await addDoc(collection(db, 'emails'), {
        leadId: selectedLeadId,
        campaignId: lead.campaignId,
        direction: 'outbound',
        subject: `Re: Our previous conversation`, // Simplified for MVP
        body: replyText,
        status: 'sent',
        createdAt: serverTimestamp(),
      });

      // Call API to actually send email via Resend (would be connected to real /api/send)
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: `Re: Our previous conversation`,
          html: `<p>${replyText.replace(/\\n/g, '<br/>')}</p>`
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messageId) {
          await updateDoc(newEmailRef, { resendMessageId: data.messageId });
        }
      }

      setReplyText('');
    } catch (error) {
      console.error('Error sending manual reply:', error);
      alert('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const selectedLead = repliedLeads.find(l => l.id === selectedLeadId);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 2 }}>
      {/* LEFT PANE: Leads List */}
      <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6">Inbox</Typography>
        </Box>
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {loadingLeads ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={24} /></Box>
          ) : repliedLeads.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>No replied leads yet.</Box>
          ) : (
            repliedLeads.map((lead) => (
              <React.Fragment key={lead.id}>
                <ListItemButton 
                  selected={selectedLeadId === lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <ListItemAvatar>
                    <Badge color="error" variant="dot" invisible={!lead.hasUnread}>
                      <Avatar>{lead.firstName.charAt(0)}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={`${lead.firstName} ${lead.lastName}`}
                    secondary={lead.company}
                    primaryTypographyProps={{ fontWeight: lead.hasUnread ? 'bold' : 'normal' }}
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* RIGHT PANE: Thread View */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedLead ? (
          <>
            {/* Header */}
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{selectedLead.firstName} {selectedLead.lastName}</Typography>
              <Typography variant="body2" color="text.secondary">{selectedLead.email}</Typography>
            </Box>

            {/* Thread */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {thread.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>Loading thread...</Typography>
              ) : (
                thread.map((msg, idx) => {
                  const isOutbound = msg.direction === 'outbound';
                  const firstUnreadIndex = thread.findIndex(m => m.direction === 'inbound' && m.isRead === false);
                  const showUnreadDivider = idx === firstUnreadIndex;

                  return (
                    <React.Fragment key={msg.id || idx}>
                      {showUnreadDivider && (
                        <Box ref={unreadRef} sx={{ width: '100%', my: 2 }}>
                          <Divider sx={{ '&::before, &::after': { borderColor: 'error.light' } }}>
                            <Typography variant="caption" color="error.main" fontWeight="bold">New Unread Messages</Typography>
                          </Divider>
                        </Box>
                      )}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: isOutbound ? 'flex-end' : 'flex-start' 
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, ml: 1, mr: 1 }}>
                          {isOutbound ? 'You' : `${selectedLead.firstName} (Prospect)`} • {msg.status} {msg.opened ? '👁️' : ''}
                        </Typography>
                        <Box sx={{ 
                          maxWidth: '75%', 
                          p: 2, 
                          borderRadius: 2,
                          bgcolor: isOutbound ? 'primary.main' : 'grey.100',
                          color: isOutbound ? 'primary.contrastText' : 'text.primary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          // Hide quoted email histories to make it look like a modern chat UI
                          '& .gmail_quote': { display: 'none' },
                          '& blockquote': { display: 'none' },
                          '& .yahoo_quoted': { display: 'none' },
                          '& div[dir="ltr"] > div.gmail_quote': { display: 'none' },
                        }}>
                          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>{msg.subject}</Typography>
                          <div dangerouslySetInnerHTML={{ __html: msg.body }} />
                        </Box>
                      </Box>
                    </React.Fragment>
                  )
                })
              )}
            </Box>

            {/* Compose */}
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Paper variant="outlined" sx={{ mb: 1 }}>
                <RichTextToolbar onInsert={(text) => setReplyText(prev => prev + text)} />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  placeholder="Type your reply here... (Use the toolbar to insert formatted text or links)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  sx={{ '& fieldset': { border: 'none' } }}
                />
              </Paper>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  variant="contained" 
                  endIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                >
                  Send Reply
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
            <Typography>Select a lead from the inbox to view thread</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
