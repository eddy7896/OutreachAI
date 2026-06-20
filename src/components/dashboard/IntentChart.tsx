'use client';

import * as React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

import { useEmails } from '@/hooks/useEmails';

const COLORS = {
  POSITIVE_INTEREST: '#10B981',
  MORE_INFO_REQUESTED: '#F59E0B',
  NOT_INTERESTED: '#EF4444',
  OUT_OF_OFFICE: '#6366F1',
  BOUNCE: '#94A3B8',
  UNKNOWN: '#CBD5E1',
};

export default function IntentChart() {
  const { emails } = useEmails();

  const receivedEmails = emails.filter(e => e.direction === 'inbound');
  
  const intentMap: Record<string, number> = {};
  receivedEmails.forEach(email => {
    const intent = email.intent || 'UNKNOWN';
    intentMap[intent] = (intentMap[intent] || 0) + 1;
  });

  const data = Object.keys(intentMap).map(key => ({
    name: key.replace(/_/g, ' '),
    value: intentMap[key],
    color: COLORS[key as keyof typeof COLORS] || COLORS.UNKNOWN
  })).sort((a, b) => b.value - a.value);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Intent Breakdown (Last 30 Days)
        </Typography>
        <Box sx={{ height: 300, width: '100%', mt: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
