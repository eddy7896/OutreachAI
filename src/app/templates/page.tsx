'use client';

import * as React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, Chip, CircularProgress, Alert, Divider } from '@mui/material';
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
        <Grid container spacing={4}>
          {templates.map((template) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={template.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderRadius: 3,
                  boxShadow: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: 8,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 800 }}>
                      {template.name}
                    </Typography>
                    <Chip 
                      label={template.category.replace('_', ' ')} 
                      size="small" 
                      color={template.category === 'cold_outreach' ? 'primary' : 'default'}
                      variant={template.category === 'cold_outreach' ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                  <Typography variant="subtitle2" color="primary.main" gutterBottom sx={{ fontWeight: 600 }}>
                    Subject: {template.subject}
                  </Typography>
                  <Box 
                    sx={{ 
                      mt: 3, 
                      p: 2, 
                      bgcolor: '#f8fafc', 
                      borderRadius: 2, 
                      border: '1px solid', 
                      borderColor: 'divider' 
                    }}
                  >
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        display: '-webkit-box', 
                        WebkitLineClamp: 4, 
                        WebkitBoxOrient: 'vertical', 
                        overflow: 'hidden',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}
                    >
                      {template.body}
                    </Typography>
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ p: 2, bgcolor: 'background.default', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, display: 'flex', gap: 1 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }}
                    onClick={() => router.push(`/templates/${template.id}`)}
                  >
                    Edit Template
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', minWidth: 'auto' }}
                    onClick={() => handleDelete(template.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
