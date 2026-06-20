'use client';

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Box, Typography, Grid, Paper, FormControl, InputLabel, 
  Select, MenuItem, TextField, Button, CircularProgress, Alert, Divider
} from '@mui/material';
import { AutoAwesome, Send as SendIcon } from '@mui/icons-material';
import { useLeads } from '@/hooks/useLeads';
import { useProducts } from '@/hooks/useProducts';
import { useTemplates } from '@/hooks/useTemplates';
import { fetchOne, createDocument, updateDocument } from '@/lib/firestore';
import { Lead, Product, EmailTemplate, Email } from '@/types';

function ComposeContent() {
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get('leadId');

  const { leads, loading: leadsLoading } = useLeads();
  const { products, loading: productsLoading } = useProducts();
  const { templates, loading: templatesLoading } = useTemplates();

  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId || '');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pre-select product if lead has a target product that matches
  useEffect(() => {
    if (selectedLeadId && leads.length > 0 && products.length > 0) {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (lead && lead.targetProduct) {
        const product = products.find(p => p.name.toLowerCase().includes(lead.targetProduct.toLowerCase()));
        if (product && !selectedProductId) {
          setSelectedProductId(product.id);
        }
      }
    }
  }, [selectedLeadId, leads, products, selectedProductId]);

  const handleGenerate = async () => {
    if (!selectedLeadId || !selectedProductId) {
      setError('Please select a Lead and a Product.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    const lead = leads.find(l => l.id === selectedLeadId);
    const product = products.find(p => p.id === selectedProductId);
    const template = templates.find(t => t.id === selectedTemplateId);

    try {
      const endpoint = template ? '/api/generate' : '/api/auto-format';
      const payload = template 
        ? { lead, productContext: product, template }
        : { lead, productContext: product };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to generate email');

      setSubject(data.subject || '');
      setBody(data.body || '');
      setSuccess('Draft generated successfully! You can review and edit it below.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendOrSave = async (action: 'draft' | 'send') => {
    if (!selectedLeadId || !subject || !body) return;
    
    setIsSending(true);
    setError(null);
    setSuccess(null);
    try {
      const lead = leads.find(l => l.id === selectedLeadId);
      
      let resendMessageId = undefined;
      let finalBody = body;

      // 1. Create the Email document first to get an ID
      const newEmail = await createDocument<Email>('emails', {
        leadId: selectedLeadId,
        direction: 'outbound',
        subject,
        body: finalBody,
        status: action === 'send' ? 'sent' : 'draft',
        opened: false,
      });
      
      if (action === 'send') {
        // 2. Append tracking pixel with the generated email ID
        const trackingPixel = `<img src="${window.location.origin}/api/track?emailId=${newEmail.id}" width="1" height="1" alt="" />`;
        finalBody = body + trackingPixel;

        // 3. Send via Resend
        const response = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: lead?.email,
            subject,
            body: finalBody
          }),
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send email via Resend');
        resendMessageId = data.messageId;

        // 4. Update the document with final body (including pixel) and resend ID
        await updateDocument<Email>('emails', newEmail.id, {
          body: finalBody,
          resendMessageId,
        });
      }
      
      setSuccess(action === 'send' ? 'Email sent successfully via Resend!' : 'Email draft saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to process email');
    } finally {
      setIsSending(false);
    }
  };

  if (leadsLoading || productsLoading || templatesLoading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Compose Email</Typography>
        <Typography color="text.secondary">
          Select a lead and product, then let AI generate a highly personalized email.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Left Column: Selections */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Context Setup</Typography>
            
            <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
              <InputLabel>Select Lead *</InputLabel>
              <Select
                value={selectedLeadId}
                label="Select Lead *"
                onChange={(e) => setSelectedLeadId(e.target.value)}
              >
                {leads.map(lead => (
                  <MenuItem key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName} ({lead.company})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Target Product *</InputLabel>
              <Select
                value={selectedProductId}
                label="Target Product *"
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map(product => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Base Template (Optional)</InputLabel>
              <Select
                value={selectedTemplateId}
                label="Base Template (Optional)"
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <MenuItem value=""><em>No Template (Full AI Generation)</em></MenuItem>
                {templates.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              color="secondary"
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesome />}
              onClick={handleGenerate}
              disabled={isGenerating || !selectedLeadId || !selectedProductId}
            >
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </Button>
          </Paper>
        </Grid>

        {/* Right Column: Editor */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Draft</Typography>
            
            <TextField
              fullWidth
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 2, mt: 2 }}
            />
            
            <TextField
              fullWidth
              label="Body (HTML)"
              multiline
              rows={15}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              sx={{ flexGrow: 1, mb: 3 }}
              slotProps={{
                input: {
                  sx: { alignItems: 'flex-start' }
                }
              }}
            />

            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={() => { setSubject(''); setBody(''); }}>
                Clear
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleSendOrSave('draft')}
                disabled={isSending || !subject || !body}
              >
                Save Draft
              </Button>
              <Button 
                variant="contained" 
                startIcon={<SendIcon />}
                onClick={() => handleSendOrSave('send')}
                disabled={isSending || !subject || !body}
              >
                {isSending ? 'Processing...' : 'Send Now'}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ComposeContent />
    </Suspense>
  );
}
