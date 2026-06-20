'use client';

import * as React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, AccountTree as TreeIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useSequences } from '@/hooks/useSequences';

export default function SequencesPage() {
  const router = useRouter();
  const { sequences, loading, error, removeSequence } = useSequences();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sequence?')) {
      await removeSequence(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Outreach Sequences</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push('/sequences/new')}
        >
          Create Sequence
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading sequences: {error.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : sequences.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
          <TreeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No sequences found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Build an A/B flow logic tree for follow-ups.
          </Typography>
          <Button variant="outlined" onClick={() => router.push('/sequences/new')}>
            Create a Sequence
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sequences.map((sequence) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={sequence.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="div" gutterBottom>
                    {sequence.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Nodes: {sequence.nodes?.length || 0}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => router.push(`/sequences/${sequence.id}`)}>Edit Flow</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(sequence.id)}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
