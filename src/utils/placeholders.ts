import { Lead } from '@/types';

export const PLACEHOLDERS = [
  { key: '{{first_name}}', label: 'First Name' },
  { key: '{{last_name}}', label: 'Last Name' },
  { key: '{{full_name}}', label: 'Full Name' },
  { key: '{{email}}', label: 'Email' },
  { key: '{{company}}', label: 'Company' },
  { key: '{{job_title}}', label: 'Job Title' },
  { key: '{{industry}}', label: 'Industry' },
  { key: '{{product}}', label: 'Target Product' },
  { key: '{{phone}}', label: 'Phone Number' },
];

export function resolvePlaceholders(text: string, lead?: Partial<Lead>): string {
  if (!lead || !text) return text;

  let resolvedText = text;
  
  const map: Record<string, string> = {
    '{{first_name}}': lead.firstName || '',
    '{{last_name}}': lead.lastName || '',
    '{{full_name}}': `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    '{{email}}': lead.email || '',
    '{{company}}': lead.company || '',
    '{{job_title}}': lead.jobTitle || '',
    '{{industry}}': lead.industry || '',
    '{{product}}': lead.targetProduct || '',
    '{{phone}}': lead.phone || '',
  };

  // Replace all known placeholders
  Object.keys(map).forEach(key => {
    // using regex with global flag to replace all occurrences
    const regex = new RegExp(key, 'g');
    resolvedText = resolvedText.replace(regex, map[key] || '');
  });

  return resolvedText;
}
