'use client';

import * as React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { useLeads } from '@/hooks/useLeads';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useEmails } from '@/hooks/useEmails';

export default function DashboardStats() {
  const { leads } = useLeads();
  const { campaigns } = useCampaigns();
  const { emails } = useEmails();

  const totalLeads = leads.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  
  // Use actual data
  const emailsSent = emails.filter(e => e.direction === 'outbound' && e.status === 'sent').length;
  const replies = emails.filter(e => e.direction === 'inbound').length;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="subtitle2">
              Total Leads
            </Typography>
            <Typography variant="h4" color="primary.main">
              {totalLeads}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="subtitle2">
              Active Campaigns
            </Typography>
            <Typography variant="h4" color="info.main">
              {activeCampaigns}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="subtitle2">
              Emails Sent
            </Typography>
            <Typography variant="h4" color="secondary.main">
              {emailsSent}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom variant="subtitle2">
              Replies
            </Typography>
            <Typography variant="h4" color="success.main">
              {replies}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
