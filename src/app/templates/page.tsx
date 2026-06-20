'use client';

import * as React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, Chip, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useTemplates } from '@/hooks/useTemplates';

export default function TemplatesPage() {
  const router = useRouter();
  const { templates, loading, error, removeTemplate } = useTemplates();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      await removeTemplate(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Email Templates</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push('/templates/new')}
        >
          Create Template
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading templates: {error.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No templates found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Create your first email template to standardize your outreach.
          </Typography>
          <Button variant="outlined" onClick={() => router.push('/templates/new')}>
            Create a Template
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {template.name}
                    </Typography>
                    <Chip 
                      label={template.category.replace('_', ' ')} 
                      size="small" 
                      color={template.category === 'cold_outreach' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Subject: {template.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 2 }}>
                    {template.body}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => router.push(`/templates/${template.id}`)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(template.id)}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
