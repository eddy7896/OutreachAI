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
import { useSignatures } from '@/hooks/useSignatures';
import { fetchOne, createDocument, updateDocument } from '@/lib/firestore';
import { Lead, Product, EmailTemplate, Email } from '@/types';
import { RichTextToolbar } from '@/components/ui/RichTextToolbar';

function ComposeContent() {
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get('leadId');
  const draftId = searchParams.get('draftId');

  const { leads, loading: leadsLoading } = useLeads();
  const { products, loading: productsLoading } = useProducts();
  const { templates, loading: templatesLoading } = useTemplates();
  const { signatures } = useSignatures();

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(initialLeadId || '');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingEmailId, setEditingEmailId] = useState<string | null>(draftId);

  // Load draft if draftId is provided
  useEffect(() => {
    if (draftId && leads.length > 0) {
      const loadDraft = async () => {
        try {
          const draftEmail = await fetchOne<Email>('emails', draftId);
          if (draftEmail) {
            setSelectedLeadId(draftEmail.leadId);
            setSubject(draftEmail.subject || '');
            setBody(draftEmail.body || '');
          }
        } catch (e) {
          console.error(e);
        }
      }
      loadDraft();
    }
  }, [draftId, leads]);

  // Pre-select product and company if lead is available
  useEffect(() => {
    if (selectedLeadId && leads.length > 0) {
      const lead = leads.find(l => l.id === selectedLeadId);
      if (lead) {
        if (!selectedCompany && lead.company) {
          setSelectedCompany(lead.company);
        }
        if (lead.targetProduct && products.length > 0) {
          const product = products.find(p => p.name.toLowerCase().includes(lead.targetProduct.toLowerCase()));
          if (product && !selectedProductId) {
            setSelectedProductId(product.id);
          }
        }
      }
    }
  }, [selectedLeadId, leads, products, selectedProductId, selectedCompany]);

  const uniqueCompanies = React.useMemo(() => {
    const companies = leads.map(l => l.company).filter(Boolean);
    return Array.from(new Set(companies)).sort();
  }, [leads]);

  const filteredLeads = React.useMemo(() => {
    if (!selectedCompany) return leads;
    return leads.filter(l => l.company === selectedCompany);
  }, [leads, selectedCompany]);

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

      const defaultSig = signatures.find(s => s.isDefault);
      const signatureHtml = defaultSig ? `<br/><br/>${defaultSig.htmlContent}` : '';

      setSubject(data.subject || '');
      setBody((data.body || '') + signatureHtml);
      setSuccess('Draft generated successfully! You can review and edit it below.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadTemplateDirectly = () => {
    if (!selectedLeadId || !selectedTemplateId) {
      setError('Please select a Lead and a Base Template to load.');
      return;
    }
    setError(null);
    setSuccess(null);

    const lead = leads.find(l => l.id === selectedLeadId);
    const product = products.find(p => p.id === selectedProductId);
    const template = templates.find(t => t.id === selectedTemplateId);

    if (!lead || !template) return;

    let loadedSubject = template.subject || '';
    let loadedBody = template.body || '';

    const variables: Record<string, string> = {
      '{{firstName}}': lead.firstName || '',
      '{{lastName}}': lead.lastName || '',
      '{{company}}': lead.company || '',
      '{{productName}}': product?.name || 'our product',
    };

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(key.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'gi');
      loadedSubject = loadedSubject.replace(regex, variables[key]);
      loadedBody = loadedBody.replace(regex, variables[key]);
    });

    const defaultSig = signatures.find(s => s.isDefault) || signatures[0];
    const signatureHtml = defaultSig ? `<br/><br/>${defaultSig.htmlContent}` : '';

    setSubject(loadedSubject);
    setBody(loadedBody + signatureHtml);
    setSuccess('Template loaded directly! You can review and edit it below.');
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

      let emailId = editingEmailId;

      if (emailId) {
        // Update existing draft
        await updateDocument<Email>('emails', emailId, {
          leadId: selectedLeadId,
          subject,
          body: finalBody,
          status: action === 'send' ? 'sent' : 'draft',
        });
      } else {
        // Create the Email document first to get an ID
        const newEmail = await createDocument<Email>('emails', {
          leadId: selectedLeadId,
          direction: 'outbound',
          subject,
          body: finalBody,
          status: action === 'send' ? 'sent' : 'draft',
          opened: false,
        });
        emailId = newEmail.id;
        setEditingEmailId(emailId);
      }
      
      if (action === 'send') {
        // 2. Append tracking pixel with the generated email ID
        const trackingPixel = `<img src="${window.location.origin}/api/track?emailId=${emailId}" width="1" height="1" alt="" />`;
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
        await updateDocument<Email>('emails', emailId, {
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
              <InputLabel>Select Company</InputLabel>
              <Select
                value={selectedCompany}
                label="Select Company"
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedLeadId(''); // reset lead when company changes
                }}
              >
                <MenuItem value=""><em>All Companies</em></MenuItem>
                {uniqueCompanies.map(company => (
                  <MenuItem key={company} value={company}>
                    {company}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Contact *</InputLabel>
              <Select
                value={selectedLeadId}
                label="Select Contact *"
                onChange={(e) => setSelectedLeadId(e.target.value)}
                disabled={filteredLeads.length === 0}
              >
                {filteredLeads.map(lead => (
                  <MenuItem key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName} {!selectedCompany ? `(${lead.company})` : ''}
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
              sx={{ mb: 1 }}
            >
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={handleLoadTemplateDirectly}
              disabled={isGenerating || !selectedLeadId || !selectedTemplateId}
            >
              Load Template Directly
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
            
            <Paper variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', mb: 3 }}>
              <RichTextToolbar onInsert={(text) => setBody(prev => prev + text)} />
              <TextField
                fullWidth
                placeholder="Body (HTML)"
                multiline
                rows={15}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                sx={{ flexGrow: 1, '& fieldset': { border: 'none' } }}
                slotProps={{
                  input: {
                    sx: { alignItems: 'flex-start' }
                  }
                }}
              />
            </Paper>

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
