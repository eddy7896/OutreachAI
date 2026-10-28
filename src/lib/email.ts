import { resolvePlaceholders } from '@/utils/placeholders';
import { generateWithFallback } from '@/lib/ai';
import { getResend } from '@/lib/resend';
import { fetchOne } from '@/lib/firestore';
import { AppSettings, EmailTemplate, Lead, Product } from '@/types';

// Shared by the /api/generate and /api/send routes and the sequence engines, which
// call these directly instead of over HTTP (internal requests carry no session).

export type GeneratedEmail = { subject: string; body: string };

type GenerateInput = {
  lead: Partial<Lead>;
  template: Pick<EmailTemplate, 'subject' | 'body'>;
  productContext?: Partial<Product> | null;
};

/**
 * Fills the template's placeholders from the lead and, when product context is
 * given, has the AI polish it. Throws if the AI fails or returns unusable output.
 */
export async function generateEmail({ lead, productContext, template }: GenerateInput): Promise<GeneratedEmail> {
  // Step 1: Pre-fill what we can using exact variable mapping
  const prefilledSubject = resolvePlaceholders(template.subject, lead);
  const prefilledBody = resolvePlaceholders(template.body, lead);

  // If no product context is provided and we just want simple variable replacement
  if (!productContext || !productContext.name) {
    return { subject: prefilledSubject, body: prefilledBody };
  }

  // Step 2: Use AI to enrich the pre-filled template with product context
  const prompt = `
You are an expert B2B sales development representative (SDR). 
Your objective is to finalize a cold outreach email based on a provided template, lead data, and product context.

PROSPECT CONTEXT:
Name: ${lead.firstName} ${lead.lastName}
Company: ${lead.company}
Job Title: ${lead.jobTitle || 'Unknown'}
Industry: ${lead.industry}
Remarks/Notes: ${lead.remarks || 'None'}

PRODUCT WE ARE PITCHING:
Product Name: ${productContext.name}
Description: ${productContext.description}
Value Proposition: ${productContext.valueProposition}
Key Features: ${productContext.keyFeatures?.join(', ') || 'None specified'}
Target Audience: ${productContext.targetAudience}

BASE TEMPLATE (Variables pre-filled where possible):
Subject: ${prefilledSubject}
Body: 
${prefilledBody}

INSTRUCTIONS:
1. Review the Base Template. Ensure it flows naturally.
2. If the Base Template has any remaining unfilled placeholders or awkward transitions, fix them using the Prospect and Product contexts.
3. If the template is very basic (e.g. just a skeleton), expand it slightly to incorporate the Product Value Proposition that is most relevant to the prospect's Industry and Job Title.
4. DO NOT change the core message or tone of the Base Template, just polish it and make it highly personalized.
5. Keep it concise.
6. Output ONLY valid JSON in the exact format below, with no markdown formatting or extra text.

OUTPUT SCHEMA:
{
  "subject": "The polished email subject line",
  "body": "The HTML formatted email body (use <br> for line breaks and <p> for paragraphs)"
}
    `;

  const data = await generateWithFallback(prompt, true);
  if (typeof data?.subject !== 'string' || typeof data?.body !== 'string') {
    throw new Error('AI returned an email without a subject or body');
  }
  return { subject: data.subject, body: data.body };
}

/** A send the provider refused (bad address, unverified domain, ...), as opposed to an outage. */
export class EmailRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmailRejectedError';
  }
}

/** Sends through Resend using the sender identity and Reply-To from Settings. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ messageId?: string }> {
  // Fetch the settings to get the dynamic sender email
  const settings = await fetchOne<AppSettings>('settings', 'global');
  const senderEmail = settings?.profile?.senderEmail;
  const replyToEmail = settings?.profile?.replyToEmail;

  let fromEmail = 'onboarding@resend.dev';
  if (senderEmail) {
    fromEmail = senderEmail;
  } else if (process.env.NODE_ENV !== 'development') {
    fromEmail = 'hello@yourdomain.com'; // fallback if no setting exists
  }

  const senderName = settings?.profile?.name || 'Outreach AI';

  const data = await getResend().emails.send({
    from: `${senderName} <${fromEmail}>`,
    to: [to],
    ...(replyToEmail ? { replyTo: replyToEmail } : {}),
    subject,
    html,
  });

  if (data.error) throw new EmailRejectedError(data.error.message);
  return { messageId: data.data?.id };
}
