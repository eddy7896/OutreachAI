'use client';

import * as React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';

import { useLeads } from '@/hooks/useLeads';
import { useEmails } from '@/hooks/useEmails';

const colors = ['#94A3B8', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];

export default function FunnelChart() {
  const { leads } = useLeads();
  const { emails } = useEmails();

  const totalLeads = leads.length;
  const emailsSent = emails.filter(e => e.direction === 'outbound' && (e.status === 'sent' || e.status === 'delivered' || e.status === 'opened')).length;
  const emailsOpened = emails.filter(e => e.direction === 'outbound' && e.opened === true).length;
  const replies = emails.filter(e => e.direction === 'inbound').length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'converted').length;

  const data = [
    { name: 'Leads Found', value: totalLeads },
    { name: 'Emails Sent', value: emailsSent },
    { name: 'Opened', value: emailsOpened },
    { name: 'Replied', value: replies },
    { name: 'Qualified', value: qualifiedLeads },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Outreach Funnel
        </Typography>
        <Box sx={{ height: 300, width: '100%', mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} />
              <RechartsTooltip />
              <Bar dataKey="value" fill="#8884d8" barSize={30}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
