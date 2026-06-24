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
    prompt: 'System Prompt:\nYou are an elite B2B copywriter. Write a highly personalized cold email using the AIDA framework.\n\nConstraints:\n- Maximum 150 words.\n- No jargon, buzzwords, or generic openings (e.g., "I hope this finds you well").\n- Tone: Confident, crisp, and value-driven.\n\nInstructions:\n1. Attention: Hook the reader in the first sentence with an unexpected observation about their company or a contrarian industry insight.\n2. Interest: Introduce a highly relevant statistic or operational challenge they are currently facing.\n3. Desire: Reveal how our specific solution uniquely solves this challenge, highlighting quantifiable metrics or a mini case-study.\n4. Action: Conclude with a single, ultra-low-friction call to action (e.g., "Open to a quick chat next Tuesday?").'
  },
  {
    title: 'PAS (Problem, Agitate, Solve)',
    description: 'Highly effective for B2B. Identify a specific pain point they are likely experiencing, agitate it by explaining the negative consequences, and then introduce your product as the solution.',
    prompt: 'System Prompt:\nYou are an elite B2B copywriter. Write a hyper-targeted outreach email using the Problem-Agitate-Solve (PAS) framework.\n\nConstraints:\n- Maximum 120 words.\n- Tone: Empathetic yet authoritative.\n- Format: Short, punchy paragraphs (1-2 sentences max).\n\nInstructions:\n1. Problem: Immediately identify a painful operational or financial bottleneck inherent to the prospect\'s role.\n2. Agitate: Twist the knife. Quantify the hidden costs of this problem—wasted engineering hours, lost revenue, or severe compliance risks.\n3. Solve: Position our product as the frictionless, immediate solution. Highlight how fast they can see ROI.\n4. CTA: End with a simple, direct question asking to gauge their interest.'
  },
  {
    title: 'BAB (Before, After, Bridge)',
    description: 'Paint a picture of their current world (Before), show them what their world would look like if the problem was solved (After), and explain how your product gets them there (Bridge).',
    prompt: 'System Prompt:\nYou are an expert sales copywriter. Write an email using the Before-After-Bridge (BAB) framework.\n\nConstraints:\n- Exactly 4 paragraphs.\n- Tone: Visionary and consultative.\n- Do not mention our product until the 3rd paragraph.\n\nInstructions:\n1. Before: Accurately describe the frustrating, manual, or inefficient state of their current workflow.\n2. After: Paint a vivid picture of a streamlined future where this friction is completely eliminated, focusing on the emotional and financial relief.\n3. Bridge: Introduce our platform as the exact bridge that takes them from the \'Before\' to the \'After\'.\n4. CTA: Ask if they are open to seeing a 5-minute teardown of how we achieve this.'
  },
  {
    title: "The 3 C's (Clear, Concise, Compelling)",
    description: 'Best for busy executives. Keep it under 4 sentences. Be direct about what you do and why it matters to them.',
    prompt: 'System Prompt:\nYou are communicating with a highly busy executive. Use the 3 C\'s framework: Clear, Concise, Compelling.\n\nConstraints:\n- STRICT LIMIT: Maximum 4 sentences.\n- No fluff, no introductory pleasantries.\n- Tone: Executive, respectful of their time, extremely direct.\n\nInstructions:\n1. Sentence 1 (Clear): State exactly who we are and the core problem we solve.\n2. Sentence 2 & 3 (Concise & Compelling): Provide a single, massive value proposition backed by a hard metric (e.g., "We recently helped [Competitor/Similar Co] increase yield by 24%").\n3. Sentence 4 (CTA): A direct ask for a 10-minute meeting to discuss potential alignment.'
  },
  {
    title: 'FAB (Features, Advantages, Benefits)',
    description: 'Focuses on what the product does, why it is better than alternatives, and how it directly improves the prospect\'s life or metrics.',
    prompt: 'System Prompt:\nWrite a product-led sales email using the Features-Advantages-Benefits (FAB) framework.\n\nConstraints:\n- Keep the feature description brief; focus heavily on the benefit.\n- Tone: Educational and confident.\n\nInstructions:\n1. Feature: Mention one specific, highly differentiated feature of our product.\n2. Advantage: Explain the technical or operational advantage this feature has over legacy systems or manual work.\n3. Benefit: Translate that advantage into a hard business benefit (e.g., hours saved per week, immediate cost reduction).\n4. CTA: Propose a quick demo to show them this feature in action.'
  },
  {
    title: 'STAR (Situation, Task, Action, Result)',
    description: 'Great for case-study or storytelling emails. Describe a situation a similar client faced, the task at hand, the action taken using your product, and the quantifiable result.',
    prompt: 'System Prompt:\nWrite a storytelling outreach email using the STAR framework to act as a micro-case study.\n\nConstraints:\n- Maximum 150 words.\n- Tone: Narrative, authoritative, and data-driven.\n\nInstructions:\n1. Situation: Briefly describe a critical situation or market shift a similar company in their industry recently faced.\n2. Task: Explain the difficult mandate or goal they needed to achieve to survive/thrive.\n3. Action: Detail how they deployed our platform to tackle this challenge.\n4. Result: Reveal the quantifiable, impressive result they achieved within a specific timeframe.\n5. CTA: Ask if they are facing a similar situation and would like to see the playbook.'
  },
  {
    title: 'PPPP (Picture, Promise, Prove, Push)',
    description: 'Paint a picture of a desired outcome, promise that you can deliver it, prove it with a quick metric or namedrop, and push them to take action.',
    prompt: 'System Prompt:\nWrite a persuasive email using the Picture-Promise-Prove-Push (PPPP) framework.\n\nConstraints:\n- Tone: Visionary, bold, and evidence-based.\n- Maximum 140 words.\n\nInstructions:\n1. Picture: Help the prospect visualize achieving their ultimate quarterly/yearly KPI.\n2. Promise: Make a bold promise that our solution can guarantee or drastically accelerate this outcome.\n3. Prove: Immediately back up the promise with a hard metric, an award, or a recognizable client name-drop.\n4. Push: Push for immediate action by offering a highly valuable, free resource (like an audit or custom report) in exchange for a 10-minute meeting.'
  }
];

const HIERARCHY = [
  {
    title: 'C-Suite (CEO, CTO, CFO, Founder)',
    description: 'Executives care about top-line revenue, bottom-line savings, strategic risk, and high-level ROI. They do not care about features. Keep it extremely brief.',
    prompt: 'System Prompt:\nWrite a cold email specifically tailored for a C-Level Executive (CEO/CFO/CTO).\n\nConstraints:\n- STRICT LIMIT: Under 70 words. Executives skim.\n- Tone: Peer-to-peer, highly professional, no desperation.\n- Absolutely no technical jargon or feature lists.\n\nInstructions:\n- Focus 100% on strategic business outcomes: Top-line revenue growth, bottom-line cost reduction, or mitigating enterprise risk.\n- Mention how we help companies of similar scale achieve a specific financial KPI.\n- End with a low-friction CTA asking to connect them with the appropriate person on their team.'
  },
  {
    title: 'VPs & Directors',
    description: 'Middle management cares about hitting departmental KPIs, team efficiency, and looking good to their bosses without taking on massive risk.',
    prompt: 'System Prompt:\nWrite an outreach email specifically tailored for a VP or Director-level decision maker.\n\nConstraints:\n- Maximum 120 words.\n- Tone: Consultative and performance-oriented.\n\nInstructions:\n- Focus on operational execution. They have quarterly targets to hit.\n- Explain how our solution directly impacts their departmental KPIs, improves workflow efficiency for their team, and reduces execution risk.\n- Emphasize speed of implementation so they don\'t fear a massive operational overhaul.\n- CTA: Ask for a brief introductory call to share industry benchmarks.'
  },
  {
    title: 'Managers & End Users',
    description: 'The people in the trenches. They care about ease of use, eliminating tedious manual tasks, and making their day-to-day work less frustrating.',
    prompt: 'System Prompt:\nWrite an outreach email specifically tailored for a front-line Manager or End-User.\n\nConstraints:\n- Maximum 150 words.\n- Tone: Empathetic, helpful, and highly practical.\n\nInstructions:\n- Focus on the day-to-day friction of their job. Empathize with the tedious manual tasks, broken spreadsheets, or clunky legacy systems they are forced to use.\n- Position our tool as a massive quality-of-life improvement that saves them hours of frustrating work every week.\n- Mention that it integrates seamlessly with their existing tech stack so it won\'t disrupt their flow.\n- CTA: Offer to send them a quick 2-minute video showing the UI in action.'
  }
];

const INDUSTRIES = [
  {
    title: 'B2B SaaS & Tech',
    description: 'Focus on speed to market, seamless integrations (API/Webhooks), scalability, and competitive technical advantages.',
    prompt: 'System Prompt:\nWrite a cold email targeting a high-growth B2B SaaS or Technology company.\n\nConstraints:\n- Maximum 130 words.\n- Tone: Modern, fast-paced, and technically competent.\n\nInstructions:\n- Speak their language: Use terms like churn reduction, NRR, speed-to-market, and technical debt where appropriate.\n- Emphasize seamless integrations (REST APIs, Webhooks) and scalable infrastructure.\n- Highlight how our solution gives their engineering or product team an unfair competitive advantage without slowing down their roadmap.'
  },
  {
    title: 'Healthcare & Medical',
    description: 'Focus heavily on compliance (HIPAA, SOC2), patient outcomes, data security, and administrative cost reduction.',
    prompt: 'System Prompt:\nWrite a cold email targeting a Healthcare organization or Medical facility.\n\nConstraints:\n- Maximum 150 words.\n- Tone: Highly professional, trustworthy, and compliant.\n\nInstructions:\n- Immediately establish trust by emphasizing strict regulatory compliance (HIPAA, SOC2, HITRUST) and ironclad data security.\n- Focus on the dual benefit of reducing massive administrative overhead (billing, charting, scheduling) while simultaneously improving patient outcomes and quality of care.\n- Do not use aggressive sales tactics; focus on partnership and security.'
  },
  {
    title: 'Finance & Real Estate',
    description: 'Focus on security, yield, ROI, market advantage, and regulatory compliance.',
    prompt: 'System Prompt:\nWrite a cold email targeting a Financial Institution or Commercial Real Estate firm.\n\nConstraints:\n- Maximum 120 words.\n- Tone: Authoritative, conservative, and numbers-driven.\n\nInstructions:\n- Focus explicitly on quantifiable financial metrics: Yield generation, ROI, cost-of-capital reduction, and strict risk mitigation.\n- Mention enterprise-grade security and regulatory compliance to alleviate institutional fear.\n- Provide a specific example of how we helped a similar firm gain a measurable market advantage or execute faster on deals.'
  },
  {
    title: 'Professional Services (Agencies/Consulting)',
    description: 'Focus on billable hours, client retention, expertise, and streamlining client reporting.',
    prompt: 'System Prompt:\nWrite a cold email targeting a Professional Services firm, Agency, or Consultancy.\n\nConstraints:\n- Maximum 130 words.\n- Tone: Collaborative and growth-focused.\n\nInstructions:\n- Address their core business model: Increasing billable utilization, scaling service delivery, and improving client retention.\n- Explain how our platform automates tedious client reporting and administrative work, allowing their highly-paid experts to focus on billable client strategy.\n- Mention how this helps them scale operations without needing to aggressively increase headcount.'
  }
];

const CATEGORIES = [
  {
    title: 'Selling a Software Product',
    description: 'Highlighting product superiority, ease of onboarding, and feature-to-benefit mapping.',
    prompt: 'System Prompt:\nWrite a sales email specifically designed to sell a B2B Software (SaaS) product.\n\nConstraints:\n- Maximum 140 words.\n- Tone: Innovative and frictionless.\n\nInstructions:\n- Focus heavily on the "Time to Value" (TTV) - how incredibly fast they can onboard and see results.\n- Highlight one specific killer feature, and immediately map it to a massive business benefit.\n- Offer a low-friction CTA, such as a 5-minute interactive demo or sending over a 2-minute loom video, rather than asking for a 30-minute call immediately.'
  },
  {
    title: 'Selling a Service / Consulting',
    description: 'Establishing deep authority, offering a free audit, or providing upfront value to build trust.',
    prompt: 'System Prompt:\nWrite a sales email designed to sell high-ticket Consulting or Professional Services.\n\nConstraints:\n- Maximum 160 words.\n- Tone: Consultative, authoritative, and deeply generous with knowledge.\n\nInstructions:\n- Do not pitch the service directly. Instead, establish deep industry authority by pointing out a critical, non-obvious mistake that companies in their space are currently making.\n- Offer massive upfront value to build trust: Propose a free 15-minute teardown, a custom audit, or a personalized strategy document with no strings attached.\n- The goal is to start a conversation based on expertise, not a hard close.'
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
    <Grid container spacing={4}>
      {items.map((item, index) => (
        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
          <Card 
            sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              borderTop: 6, 
              borderColor: `${color}.main`,
              borderRadius: 3,
              boxShadow: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: 8,
                borderColor: `${color}.light`
              }
            }}
          >
            <CardContent sx={{ flexGrow: 1, p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 800, color: 'text.primary', mb: 2 }}>
                {item.title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                {item.description}
              </Typography>
              
              <Box 
                sx={{ 
                  mt: 'auto', 
                  p: 2.5, 
                  bgcolor: '#f8fafc', 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: 4, 
                    height: '100%', 
                    bgcolor: `${color}.main` 
                  }} 
                />
                <Typography variant="overline" color={`${color}.main`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, fontWeight: 700, letterSpacing: 1 }}>
                  <AutoAwesomeIcon fontSize="small" /> SYSTEM PROMPT
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {item.prompt}
                </Typography>
              </Box>
            </CardContent>
            <Divider />
            <CardActions sx={{ p: 2, bgcolor: 'background.default', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
              <Button 
                variant="contained" 
                color={color} 
                fullWidth 
                size="large"
                sx={{ 
                  py: 1.5, 
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1rem',
                  borderRadius: 2
                }}
                onClick={() => handleUsePreset(item.prompt)}
              >
                Use this System Prompt
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
