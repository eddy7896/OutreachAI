'use client';

import * as React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, Chip, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSignatures } from '@/hooks/useSignatures';

export default function SignaturesPage() {
  const router = useRouter();
  const { signatures, loading, error, removeSignature, setDefaultSignature } = useSignatures();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this signature?')) {
      await removeSignature(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Signatures</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push('/signatures/new')}
        >
          Create Signature
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading signatures: {error.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : signatures.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No signatures found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create HTML signatures to automatically append to your outreach emails.
          </Typography>
          <Button variant="outlined" onClick={() => router.push('/signatures/new')}>
            Create a Signature
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {signatures.map((sig) => (
            <Grid size={{ xs: 12, md: 6 }} key={sig.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: sig.isDefault ? '2px solid' : 'none', borderColor: 'primary.main' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {sig.name}
                    </Typography>
                    {sig.isDefault && (
                      <Chip label="Default" color="primary" size="small" icon={<StarIcon />} />
                    )}
                  </Box>
                  <Box 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'background.default', 
                      borderRadius: 1, 
                      maxHeight: 150, 
                      overflow: 'hidden',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40px',
                        background: 'linear-gradient(transparent, #f9fafb)',
                      }
                    }}
                    dangerouslySetInnerHTML={{ __html: sig.htmlContent }}
                  />
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Box>
                    <Button size="small" onClick={() => router.push(`/signatures/${sig.id}`)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(sig.id)}>Delete</Button>
                  </Box>
                  {!sig.isDefault && (
                    <Button size="small" startIcon={<StarBorderIcon />} onClick={() => setDefaultSignature(sig.id)}>
                      Set Default
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
