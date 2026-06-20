'use client';

import * as React from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, Chip, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useCampaigns } from '@/hooks/useCampaigns';

export default function CampaignsPage() {
  const router = useRouter();
  const { campaigns, loading, error, removeCampaign } = useCampaigns();

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      await removeCampaign(id);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Campaigns</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push('/campaigns/new')}
        >
          Create Campaign
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading campaigns: {error.message}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : campaigns.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No campaigns found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Start your first cold outreach campaign.
          </Typography>
          <Button variant="outlined" onClick={() => router.push('/campaigns/new')}>
            Create a Campaign
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {campaigns.map((campaign) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={campaign.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {campaign.name}
                    </Typography>
                    <Chip 
                      label={campaign.status} 
                      size="small" 
                      color={
                        campaign.status === 'active' ? 'success' : 
                        campaign.status === 'completed' ? 'default' : 
                        campaign.status === 'paused' ? 'warning' : 'primary'
                      }
                      variant="filled"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2 }}>
                    {campaign.description}
                  </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'background.default', p: 1.5, borderRadius: 1 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Sent</Typography>
                        <Typography variant="subtitle2">{campaign.stats.sent}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Replies</Typography>
                        <Typography variant="subtitle2">{campaign.stats.replied}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Positive</Typography>
                        <Typography variant="subtitle2" color="success.main">{campaign.stats.positive}</Typography>
                      </Box>
                    </Box>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => router.push(`/campaigns/${campaign.id}`)}>Manage</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(campaign.id)}>Delete</Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
