import * as React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { AssignmentTurnedIn, Warning, ErrorOutlined, InfoOutlined, Drafts, HelpOutlined } from '@mui/icons-material';

interface IntentResult {
  intent: string;
  summary: string;
  action_required: boolean;
}

interface IntentResultCardProps {
  result: IntentResult;
}

const intentConfig: Record<string, { color: 'success' | 'warning' | 'error' | 'info' | 'default', icon: React.ReactNode, label: string }> = {
  'POSITIVE_INTEREST': { color: 'success', icon: <AssignmentTurnedIn />, label: 'Positive Interest' },
  'MORE_INFO_REQUESTED': { color: 'warning', icon: <Warning />, label: 'More Info Requested' },
  'NOT_INTERESTED': { color: 'error', icon: <ErrorOutlined />, label: 'Not Interested' },
  'OUT_OF_OFFICE': { color: 'info', icon: <InfoOutlined />, label: 'Out of Office' },
  'BOUNCE': { color: 'default', icon: <Drafts />, label: 'Bounce' },
  'UNKNOWN': { color: 'default', icon: <HelpOutlined />, label: 'Unknown' },
};

export default function IntentResultCard({ result }: IntentResultCardProps) {
  const config = intentConfig[result.intent] || intentConfig['UNKNOWN'];

  return (
    <Card variant="outlined" sx={{ mt: 3, borderLeft: 6, borderColor: `${config.color}.main` }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          {React.cloneElement(config.icon as React.ReactElement<{ color?: string }>, { color: config.color === 'default' ? 'inherit' : config.color })}
          <Typography variant="h6" component="div">
            {config.label}
          </Typography>
        </Box>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          {result.summary}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label={result.action_required ? "Human Action Required" : "No Action Needed"} 
            color={result.action_required ? "primary" : "default"}
            variant={result.action_required ? "filled" : "outlined"}
            size="small"
          />
          <Chip 
            label={`Raw Intent: ${result.intent}`} 
            variant="outlined" 
            size="small"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
