'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Box, Typography, CircularProgress, Alert, Button, Grid, Paper, 
  Chip, Dialog, DialogTitle, DialogContent 
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import CampaignForm from '@/components/campaigns/CampaignForm';
import LeadTable from '@/components/leads/LeadTable';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useLeads } from '@/hooks/useLeads';
import { useProducts } from '@/hooks/useProducts';
import { useTemplates } from '@/hooks/useTemplates';
import { useSequences } from '@/hooks/useSequences';
import { fetchOne, createDocument } from '@/lib/firestore';
import { Campaign, Email } from '@/types';

export default function CampaignEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';

  const { addCampaign, updateCampaign } = useCampaigns();
  const { leads, loading: leadsLoading, removeLead } = useLeads();
  const { products, loading: productsLoading } = useProducts();
  const { templates, loading: templatesLoading } = useTemplates();
  const { sequences, loading: sequencesLoading } = useSequences();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isNew) return;

    const loadCampaign = async () => {
      try {
        const data = await fetchOne<Campaign>('campaigns', id);
        if (!data) {
          setError('Campaign not found');
        } else {
          setCampaign(data);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [id, isNew]);

  const handleSubmit = async (data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => {
    setIsSubmitting(true);
    try {
      if (isNew) {
        await addCampaign(data);
        router.push('/campaigns');
      } else {
        await updateCampaign(id, data);
        setCampaign(prev => prev ? { ...prev, ...data } : null);
        setEditModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunCampaign = async () => {
    if (!campaign) return;
    setIsRunning(true);
    try {
      const campaignLeads = leads.filter(l => l.campaignId === campaign.id && l.status === 'new');
      
      if (campaignLeads.length === 0) {
        alert("No 'new' leads found in this campaign to process.");
        return;
      }

      const product = products.find(p => p.name === campaign.targetProduct);
      const template = templates.find(t => t.id === campaign.templateId);

      const batch = campaignLeads.slice(0, 3);
      for (const lead of batch) {
        const endpoint = template ? '/api/generate' : '/api/auto-format';
        const payload = template 
          ? { lead, productContext: product, template }
          : { lead, productContext: product };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to generate email for ' + lead.email);

        await createDocument<Email>('emails', {
          leadId: lead.id,
          campaignId: campaign.id,
          direction: 'outbound',
          subject: data.subject || `Outreach to ${lead.firstName}`,
          body: data.body || '',
          status: 'draft',
        });
        
        // Note: In a full implementation, update the lead's status to 'contacted' here.
      }

      alert(`Successfully generated draft emails using AI for ${batch.length} leads!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to run campaign: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleProcessSequence = async () => {
    if (!campaign) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/cron/process-sequences?campaignId=${campaign.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process sequences');
      alert(`Processed sequences: ${data.processedCount} leads updated.`);
    } catch (err: any) {
      console.error(err);
      alert('Error processing sequences: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || productsLoading || templatesLoading || sequencesLoading || (isNew ? false : leadsLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !isNew) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/campaigns')} sx={{ mb: 2 }}>
          Back to Campaigns
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // --- NEW CAMPAIGN VIEW ---
  if (isNew) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/campaigns')} sx={{ mb: 2 }}>
            Back to Campaigns
          </Button>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Create New Campaign</Typography>
          <Typography color="text.secondary">Configure target segments and follow-up sequences.</Typography>
        </Box>

        <CampaignForm 
          products={products}
          templates={templates}
          sequences={sequences}
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting}
          onCancel={() => router.push('/campaigns')}
        />
      </Box>
    );
  }

  // --- EXISTING CAMPAIGN DASHBOARD ---
  const campaignLeads = leads.filter(l => l.campaignId === campaign?.id);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/campaigns')} sx={{ mb: 2 }}>
          Back to Campaigns
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{campaign?.name}</Typography>
              <Chip 
                label={campaign?.status} 
                color={
                  campaign?.status === 'active' ? 'success' : 
                  campaign?.status === 'paused' ? 'warning' : 'default'
                }
                variant="filled"
              />
            </Box>
            <Typography color="text.secondary">{campaign?.description}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />} 
              onClick={() => setEditModalOpen(true)}
            >
              Edit Settings
            </Button>
            <Button 
              variant="outlined" 
              color="secondary"
              startIcon={isProcessing ? <CircularProgress size={20} color="inherit"/> : <PlayArrowIcon />} 
              disabled={isProcessing || campaign?.status !== 'active'}
              onClick={handleProcessSequence}
            >
              {isProcessing ? 'Processing...' : 'Process Sequences'}
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={isRunning ? <CircularProgress size={20} color="inherit"/> : <PlayArrowIcon />} 
              disabled={isRunning || campaign?.status !== 'active'}
              onClick={handleRunCampaign}
            >
              {isRunning ? 'Running...' : 'Run Campaign (Dry Run)'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* KPI Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="subtitle2">Enrolled Leads</Typography>
            <Typography variant="h4">{campaignLeads.length}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="subtitle2">Emails Sent</Typography>
            <Typography variant="h4" color="primary.main">{campaign?.stats.sent || 0}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="subtitle2">Replies</Typography>
            <Typography variant="h4" color="secondary.main">{campaign?.stats.replied || 0}</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="subtitle2">Positive Intent</Typography>
            <Typography variant="h4" color="success.main">{campaign?.stats.positive || 0}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Leads Table */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Campaign Leads</Typography>
          <Button variant="outlined" onClick={() => router.push('/leads')}>Manage All Leads</Button>
        </Box>
        <LeadTable 
          leads={campaignLeads} 
          onDelete={removeLead} 
          loading={leadsLoading} 
        />
      </Paper>

      {/* Edit Settings Modal */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Campaign Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <CampaignForm 
              initialData={campaign || undefined}
              products={products}
              templates={templates}
              sequences={sequences}
              onSubmit={handleSubmit} 
              isSubmitting={isSubmitting}
              onCancel={() => setEditModalOpen(false)}
            />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
