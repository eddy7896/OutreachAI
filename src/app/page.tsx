'use client';

import * as React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import DashboardStats from '@/components/dashboard/DashboardStats';
import IntentChart from '@/components/dashboard/IntentChart';
import FunnelChart from '@/components/dashboard/FunnelChart';
import PendingActionsNotifier from '@/components/dashboard/PendingActionsNotifier';

export default function DashboardPage() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Dashboard</Typography>
        <Typography color="text.secondary">
          Overview of your outreach performance and intent analysis.
        </Typography>
      </Box>

      {/* Top Stats Row */}
      <Box sx={{ mb: 4 }}>
        <DashboardStats />
      </Box>

      {/* Charts Row */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FunnelChart />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <IntentChart />
        </Grid>
      </Grid>
      
      {/* Fallback Notifier for Cloud Functions */}
      <PendingActionsNotifier />
    </Box>
  );
}
