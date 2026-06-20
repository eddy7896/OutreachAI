'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Alert, FormControlLabel, Switch } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { fetchOne, createDocument, updateDocument } from '@/lib/firestore';
import { Signature } from '@/types';

export default function SignatureEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [htmlContent, setHtmlContent] = useState('<p><br>--<br><strong>Your Name</strong><br>Founder, Your Company<br>yourwebsite.com</p>');
  const [isDefault, setIsDefault] = useState(false);
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSignature() {
      if (isNew) return;
      try {
        const sig = await fetchOne<Signature>('signatures', id);
        if (sig) {
          setName(sig.name);
          setHtmlContent(sig.htmlContent);
          setIsDefault(sig.isDefault);
        } else {
          setError('Signature not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSignature();
  }, [id, isNew]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Signature name is required');
      return;
    }
    if (!htmlContent.trim()) {
      setError('Signature content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const signatureData = {
        name,
        htmlContent,
        isDefault
      };

      if (isNew) {
        await createDocument('signatures', signatureData);
      } else {
        await updateDocument('signatures', id, signatureData);
      }

      router.push('/signatures');
    } catch (err: any) {
      setError(err.message || 'Failed to save signature');
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/signatures')} sx={{ mb: 2 }}>
          Back to Signatures
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {isNew ? 'Create New Signature' : 'Edit Signature'}
        </Typography>
        <Typography color="text.secondary">
          Design your email signature using HTML.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Signature Name"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Main Founder Signature"
          />

          <FormControlLabel
            control={<Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
            label="Set as default signature for outgoing emails"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>HTML Content</Typography>
            <TextField
              fullWidth
              multiline
              rows={8}
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<p>...</p>"
              sx={{ fontFamily: 'monospace' }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Live Preview</Typography>
            <Box 
              sx={{ 
                p: 2, 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: 1,
                bgcolor: 'background.default',
                minHeight: 100
              }}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button 
              variant="contained" 
              size="large" 
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Signature'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
