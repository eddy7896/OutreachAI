'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import SingleClassifier from '@/components/classify/SingleClassifier';
import BulkClassifier from '@/components/classify/BulkClassifier';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`classify-tabpanel-${index}`}
      aria-labelledby={`classify-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ClassifyPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" mb={1}>
        Intent Classification
      </Typography>
      <Typography color="text.secondary" mb={4}>
        Analyze incoming email replies to determine the prospect's intent automatically.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="classify tabs">
          <Tab label="Single Email" />
          <Tab label="Bulk Upload" />
        </Tabs>
      </Box>
      
      <CustomTabPanel value={tabValue} index={0}>
        <SingleClassifier />
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={1}>
        <BulkClassifier />
      </CustomTabPanel>
    </Box>
  );
}
