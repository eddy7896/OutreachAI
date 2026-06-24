'use client';

import * as React from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { useEmails } from '@/hooks/useEmails';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useTemplates } from '@/hooks/useTemplates';
import { useLeads } from '@/hooks/useLeads';
import { format, subDays, startOfDay } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

export default function AnalyticsPage() {
  const { emails, loading: emailsLoading, error: emailsError } = useEmails();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const { templates, loading: templatesLoading } = useTemplates();
  const { leads, loading: leadsLoading } = useLeads();

  if (emailsLoading || campaignsLoading || templatesLoading || leadsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (emailsError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Error loading analytics data.
      </Alert>
    );
  }

  // --- Process Data ---
  const sentEmails = emails.filter(e => e.direction === 'outbound' && e.status === 'sent');
  const receivedEmails = emails.filter(e => e.direction === 'inbound');

  // 1. KPI Stats
  const totalSent = sentEmails.length;
  const totalOpened = sentEmails.filter(e => e.opened || e.status === 'opened').length;
  const totalReceived = receivedEmails.length;
  
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
  const replyRate = totalSent > 0 ? ((totalReceived / totalSent) * 100).toFixed(1) : '0.0';

  const positiveReplies = receivedEmails.filter(e => e.intent === 'POSITIVE_INTEREST').length;
  const positiveRate = totalReceived > 0 ? ((positiveReplies / totalReceived) * 100).toFixed(1) : '0.0';

  // Map leads to campaigns for inbound emails
  const leadToCampaign: Record<string, string> = {};
  leads.forEach(l => {
    if (l.campaignId) leadToCampaign[l.id] = l.campaignId;
  });

  // 2. Timeline Data (Last 30 days)
  const timelineMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const dateStr = format(subDays(new Date(), i), 'MMM dd');
    timelineMap[dateStr] = 0;
  }
  
  sentEmails.forEach(email => {
    let dateStr = '';
    if (email.createdAt && typeof email.createdAt === 'object' && 'toDate' in email.createdAt) {
      dateStr = format(email.createdAt.toDate(), 'MMM dd');
    } else if (email.createdAt) {
      dateStr = format(new Date(email.createdAt as any), 'MMM dd');
    }
    if (timelineMap[dateStr] !== undefined) {
      timelineMap[dateStr]++;
    }
  });

  const timelineData = Object.keys(timelineMap).map(date => ({
    date,
    sent: timelineMap[date]
  }));

  // 3. Intent Distribution
  const intentMap: Record<string, number> = {};
  receivedEmails.forEach(email => {
    const intent = email.intent || 'UNKNOWN';
    intentMap[intent] = (intentMap[intent] || 0) + 1;
  });

  const intentData = Object.keys(intentMap).map(key => ({
    name: key.replace(/_/g, ' '),
    value: intentMap[key]
  })).sort((a, b) => b.value - a.value);

  // 4. Campaign Performance
  const campaignStats: Record<string, { name: string, sent: number, replied: number }> = {};
  campaigns.forEach(c => {
    campaignStats[c.id] = { name: c.name, sent: 0, replied: 0 };
  });

  sentEmails.forEach(email => {
    if (email.campaignId && campaignStats[email.campaignId]) {
      campaignStats[email.campaignId].sent++;
    }
  });

  receivedEmails.forEach(email => {
    if (email.campaignId && campaignStats[email.campaignId]) {
      campaignStats[email.campaignId].replied++;
    }
  });

  const campaignData = Object.values(campaignStats)
    .filter(c => c.sent > 0 || c.replied > 0)
    .sort((a, b) => b.sent - a.sent)
    .slice(0, 5); // Top 5

  // 5. Template Performance (Convergence)
  const templateStats: Record<string, { name: string, sent: number, opened: number, replied: number }> = {};
  templates.forEach(t => {
    templateStats[t.id] = { name: t.name, sent: 0, opened: 0, replied: 0 };
  });

  const campaignToTemplate: Record<string, string> = {};
  campaigns.forEach(c => {
    if (c.templateId) {
      campaignToTemplate[c.id] = c.templateId;
    }
  });

  sentEmails.forEach(email => {
    if (email.campaignId && campaignToTemplate[email.campaignId]) {
      const tId = campaignToTemplate[email.campaignId];
      if (templateStats[tId]) {
        templateStats[tId].sent++;
        if (email.opened || email.status === 'opened') {
          templateStats[tId].opened++;
        }
      }
    }
  });

  receivedEmails.forEach(email => {
    const cId = email.campaignId || leadToCampaign[email.leadId];
    if (cId && campaignToTemplate[cId]) {
      const tId = campaignToTemplate[cId];
      if (templateStats[tId]) {
        templateStats[tId].replied++;
      }
    }
  });

  const templateData = Object.values(templateStats)
    .filter(t => t.sent > 0)
    .map(t => ({
      name: t.name,
      'Open Rate %': t.sent > 0 ? Number(((t.opened / t.sent) * 100).toFixed(1)) : 0,
      'Reply Rate %': t.sent > 0 ? Number(((t.replied / t.sent) * 100).toFixed(1)) : 0,
      sent: t.sent
    }))
    .sort((a, b) => b['Reply Rate %'] - a['Reply Rate %']); // Sort by highest conversion

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>Analytics Dashboard</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Track your global outreach performance and AI classifications.
      </Typography>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', borderTop: 4, borderColor: 'primary.main' }}>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>Sent</Typography>
            <Typography variant="h4" color="primary.main">{totalSent}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', borderTop: 4, borderColor: 'info.main' }}>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>Open Rate</Typography>
            <Typography variant="h4" color="info.main">{openRate}%</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', borderTop: 4, borderColor: 'secondary.main' }}>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>Total Replies</Typography>
            <Typography variant="h4" color="secondary.main">{totalReceived}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', borderTop: 4, borderColor: 'warning.main' }}>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>Reply Rate</Typography>
            <Typography variant="h4" color="warning.main">{replyRate}%</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%', borderTop: 4, borderColor: 'success.main' }}>
            <Typography color="text.secondary" variant="subtitle2" gutterBottom>Positive Intent</Typography>
            <Typography variant="h4" color="success.main">{positiveRate}%</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>Emails Sent (Last 30 Days)</Typography>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="sent" stroke="#1976d2" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>Reply Intent Breakdown</Typography>
            {intentData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">No replies yet</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {intentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>Top Campaigns by Volume</Typography>
            {campaignData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">No campaign data yet</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="#1976d2" name="Sent" />
                  <Bar dataKey="replied" fill="#9c27b0" name="Replies" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        
        {/* Template Convergence Chart */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>Template Convergence (Conversion Rates)</Typography>
            {templateData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">No template data yet</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={templateData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(tick) => `${tick}%`} />
                  <RechartsTooltip formatter={(value: any) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="Open Rate %" fill="#00C49F" />
                  <Bar dataKey="Reply Rate %" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
