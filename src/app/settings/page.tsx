'use client';

import * as React from 'react';
import { 
  Box, Typography, Paper, Grid, TextField, Button, Switch, 
  FormControlLabel, Divider, CircularProgress, Alert, Snackbar 
} from '@mui/material';
import { useSettings } from '@/hooks/useSettings';
import { Save as SaveIcon } from '@mui/icons-material';

export default function SettingsPage() {
  const { settings, loading, updateSettings } = useSettings();
  
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [senderEmail, setSenderEmail] = React.useState('');
  const [company, setCompany] = React.useState('');
  
  const [emailAlerts, setEmailAlerts] = React.useState(false);
  const [inAppNotifications, setInAppNotifications] = React.useState(false);
  
  const [resendApiKey, setResendApiKey] = React.useState('');
  const [geminiApiKey, setGeminiApiKey] = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Sync local state when settings load
  React.useEffect(() => {
    if (settings) {
      setName(settings.profile.name);
      setEmail(settings.profile.email);
      setSenderEmail(settings.profile.senderEmail || '');
      setCompany(settings.profile.company);
      
      setEmailAlerts(settings.preferences.emailAlerts);
      setInAppNotifications(settings.preferences.inAppNotifications);
      
      setResendApiKey(settings.apiKeys.resendApiKey);
      setGeminiApiKey(settings.apiKeys.geminiApiKey);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({
        profile: { name, email, company, senderEmail },
        preferences: { emailAlerts, inAppNotifications },
        apiKeys: { resendApiKey, geminiApiKey },
        updatedAt: new Date()
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 4 }}>Settings</Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={4}>
        {/* Profile Settings */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>Profile Information</Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField 
                  fullWidth 
                  label="Full Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField 
                  fullWidth 
                  label="Receiving Email (To)" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  helperText="Where you want to receive notifications and test emails"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField 
                  fullWidth 
                  label="Sender Email (From)" 
                  type="email" 
                  value={senderEmail} 
                  onChange={(e) => setSenderEmail(e.target.value)} 
                  helperText="The email address you verified on Resend to send campaigns from"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField 
                  fullWidth 
                  label="Company Name" 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Preferences */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>Notifications</Typography>
            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={<Switch checked={inAppNotifications} onChange={(e) => setInAppNotifications(e.target.checked)} />}
                label="In-App Notifications (Bell Icon)"
              />
              <FormControlLabel
                control={<Switch checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />}
                label="Email Alerts (Daily Digest)"
              />
            </Box>
          </Paper>
        </Grid>

        {/* API Keys */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>API Integrations</Typography>
            <Divider sx={{ mb: 3 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your API keys to enable live email sending and AI text generation. 
              These keys are stored securely in your database.
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField 
                  fullWidth 
                  label="Resend API Key" 
                  type="password"
                  value={resendApiKey} 
                  onChange={(e) => setResendApiKey(e.target.value)} 
                  helperText="Required to send emails in campaigns and compose view."
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField 
                  fullWidth 
                  label="Google Gemini API Key" 
                  type="password"
                  value={geminiApiKey} 
                  onChange={(e) => setGeminiApiKey(e.target.value)} 
                  helperText="Required to use the AI generate / auto-format features."
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          size="large" 
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </Box>

      <Snackbar 
        open={success} 
        autoHideDuration={4000} 
        onClose={() => setSuccess(false)}
        message="Settings saved successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
