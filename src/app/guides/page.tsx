'use client';

import * as React from 'react';
import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper, Button, Grid, Card, CardContent, CardActions, Divider, Chip } from '@mui/material';
import { useRouter } from 'next/navigation';
import { Description as DescriptionIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`guides-tabpanel-${index}`}
      aria-labelledby={`guides-tab-${index}`}
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

const FRAMEWORKS = [
  {
    title: 'AIDA (Attention, Interest, Desire, Action)',
    description: 'The classic marketing framework. Grab their attention, build interest in the problem, create a desire for your solution, and provide a clear call to action.',
    prompt: 'Write a cold email using the AIDA framework. Hook the reader immediately, build interest with a relevant industry statistic, create desire by highlighting our core value proposition, and end with a low-friction call to action.'
  },
  {
    title: 'PAS (Problem, Agitate, Solve)',
    description: 'Highly effective for B2B. Identify a specific pain point they are likely experiencing, agitate it by explaining the negative consequences, and then introduce your product as the solution.',
    prompt: 'Write an email using the Problem-Agitate-Solve (PAS) framework. Identify a common pain point for their role, agitate the consequences of not solving it, and position our solution as the perfect fix.'
  },
  {
    title: 'BAB (Before, After, Bridge)',
    description: 'Paint a picture of their current world (Before), show them what their world would look like if the problem was solved (After), and explain how your product gets them there (Bridge).',
    prompt: 'Write an email using the Before-After-Bridge (BAB) framework. Describe their current inefficient workflow, paint a picture of a streamlined future, and introduce our product as the bridge to get there.'
  },
  {
    title: "The 3 C's (Clear, Concise, Compelling)",
    description: 'Best for busy executives. Keep it under 4 sentences. Be direct about what you do and why it matters to them.',
    prompt: 'Write a cold email that is Clear, Concise, and Compelling. Maximum 4 sentences. State exactly what we do, the ROI they can expect, and ask if they are open to a 10-minute chat.'
  },
  {
    title: 'FAB (Features, Advantages, Benefits)',
    description: 'Focuses on what the product does, why it is better than alternatives, and how it directly improves the prospect\'s life or metrics.',
    prompt: 'Write an email using the Features-Advantages-Benefits (FAB) framework. Mention one key feature, explain its technical advantage, and focus heavily on the ultimate business benefit (time/money saved).'
  },
  {
    title: 'STAR (Situation, Task, Action, Result)',
    description: 'Great for case-study or storytelling emails. Describe a situation a similar client faced, the task at hand, the action taken using your product, and the quantifiable result.',
    prompt: 'Write an email using the STAR framework. Briefly tell a micro case-study about a similar company. Describe their situation, the action they took using our platform, and the quantifiable positive result they achieved.'
  },
  {
    title: 'PPPP (Picture, Promise, Prove, Push)',
    description: 'Paint a picture of a desired outcome, promise that you can deliver it, prove it with a quick metric or namedrop, and push them to take action.',
    prompt: 'Write an email using the Picture-Promise-Prove-Push framework. Paint a picture of achieving a major KPI, promise our tool can do it, prove it by mentioning a current client\'s success metric, and push for a quick meeting.'
  }
];

const HIERARCHY = [
  {
    title: 'C-Suite (CEO, CTO, CFO, Founder)',
    description: 'Executives care about top-line revenue, bottom-line savings, strategic risk, and high-level ROI. They do not care about features. Keep it extremely brief.',
    prompt: 'Write an email tailored for a C-Level Executive. Focus exclusively on top-line revenue impact, operational efficiency, and ROI. Do not mention specific product features. Keep it under 50 words and highly professional.'
  },
  {
    title: 'VPs & Directors',
    description: 'Middle management cares about hitting departmental KPIs, team efficiency, and looking good to their bosses without taking on massive risk.',
    prompt: 'Write an email tailored for a VP or Director. Focus on how our solution helps their specific team hit their quarterly KPIs, improves workflow efficiency, and reduces execution risk.'
  },
  {
    title: 'Managers & End Users',
    description: 'The people in the trenches. They care about ease of use, eliminating tedious manual tasks, and making their day-to-day work less frustrating.',
    prompt: 'Write an email tailored for an End-User or Manager. Focus on how our tool eliminates tedious manual data entry, integrates easily with their existing stack, and saves them hours of frustrating work every week.'
  }
];

const INDUSTRIES = [
  {
    title: 'B2B SaaS & Tech',
    description: 'Focus on speed to market, seamless integrations (API/Webhooks), scalability, and competitive technical advantages.',
    prompt: 'Write an email targeting a SaaS company. Emphasize seamless integrations, API capabilities, scalable infrastructure, and how we help them ship faster or reduce tech debt.'
  },
  {
    title: 'Healthcare & Medical',
    description: 'Focus heavily on compliance (HIPAA, SOC2), patient outcomes, data security, and administrative cost reduction.',
    prompt: 'Write an email targeting a Healthcare organization. Highlight strict compliance (HIPAA/SOC2), secure data handling, and how our solution reduces administrative overhead to improve patient focus.'
  },
  {
    title: 'Finance & Real Estate',
    description: 'Focus on security, yield, ROI, market advantage, and regulatory compliance.',
    prompt: 'Write an email targeting the Finance sector. Focus on risk mitigation, ironclad security, regulatory compliance, and driving measurable ROI or yield.'
  },
  {
    title: 'Professional Services (Agencies/Consulting)',
    description: 'Focus on billable hours, client retention, expertise, and streamlining client reporting.',
    prompt: 'Write an email targeting an Agency or Consultancy. Focus on increasing billable utilization, automating client reporting, and scaling their service delivery without adding headcount.'
  }
];

const CATEGORIES = [
  {
    title: 'Selling a Software Product',
    description: 'Highlighting product superiority, ease of onboarding, and feature-to-benefit mapping.',
    prompt: 'Write a sales email for a B2B software product. Focus on rapid onboarding, a specific killer feature, and the immediate business benefit it provides. Offer a quick demo.'
  },
  {
    title: 'Selling a Service / Consulting',
    description: 'Establishing deep authority, offering a free audit, or providing upfront value to build trust.',
    prompt: 'Write a sales email for a consulting service. Establish industry authority, mention a common critical mistake companies make, and offer a free 15-minute audit or teardown to provide upfront value.'
  }
];

export default function GuidesPage() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleUsePreset = (prompt: string) => {
    router.push(`/templates/new?preset=${encodeURIComponent(prompt)}`);
  };

  const renderCards = (items: any[], color: "primary" | "secondary" | "success" | "warning") => (
    <Grid container spacing={3}>
      {items.map((item, index) => (
        <Grid item xs={12} md={6} lg={4} key={index}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderTop: 4, borderColor: `${color}.main` }}>
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {item.description}
              </Typography>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px dashed', borderColor: 'grey.300' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                  AI PROMPT INSTRUCTION
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                  "{item.prompt}"
                </Typography>
              </Box>
            </CardContent>
            <Divider />
            <CardActions sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Button 
                variant="contained" 
                color={color} 
                fullWidth 
                startIcon={<AutoAwesomeIcon />}
                onClick={() => handleUsePreset(item.prompt)}
              >
                Use this Preset
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
          <DescriptionIcon fontSize="large" color="primary" />
          Writing Guides & Prompt Presets
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 800 }}>
          Master the art of cold outreach with these proven copywriting frameworks, tailored for specific industries and decision-makers. Click <strong>Use this Preset</strong> to instantly load the AI instructions into a new Template!
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="guides tabs" variant="scrollable" scrollButtons="auto">
            <Tab label="Copywriting Frameworks" />
            <Tab label="By Role Hierarchy" />
            <Tab label="By Industry" />
            <Tab label="Product vs Service" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3 }}>
            <Chip label="High Conversion" color="primary" size="small" sx={{ mb: 2 }} />
            <Typography variant="h6">Proven Structural Frameworks</Typography>
            <Typography variant="body2" color="text.secondary">
              These are the gold-standard structures used by top copywriters to grab attention and drive action.
            </Typography>
          </Box>
          {renderCards(FRAMEWORKS, "primary")}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 3 }}>
            <Chip label="Target Audience" color="secondary" size="small" sx={{ mb: 2 }} />
            <Typography variant="h6">Writing for the Hierarchy</Typography>
            <Typography variant="body2" color="text.secondary">
              A CEO does not care about the same things a Manager cares about. Adjust your tone and focus based on who you are emailing.
            </Typography>
          </Box>
          {renderCards(HIERARCHY, "secondary")}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 3 }}>
            <Chip label="Niche Specific" color="success" size="small" sx={{ mb: 2 }} />
            <Typography variant="h6">Industry Specific Angles</Typography>
            <Typography variant="body2" color="text.secondary">
              Speak their language. Highlight the specific value propositions that resonate most in their vertical.
            </Typography>
          </Box>
          {renderCards(INDUSTRIES, "success")}
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ mb: 3 }}>
            <Chip label="Strategy" color="warning" size="small" sx={{ mb: 2 }} />
            <Typography variant="h6">Product vs Service Sales</Typography>
            <Typography variant="body2" color="text.secondary">
              Selling a tangible software product requires a different approach than selling a high-ticket consulting service.
            </Typography>
          </Box>
          {renderCards(CATEGORIES, "warning")}
        </TabPanel>
      </Paper>
    </Box>
  );
}
