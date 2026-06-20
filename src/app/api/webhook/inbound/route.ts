import { NextResponse } from 'next/server';
import { fetchAll, createDocument, updateDocument } from '@/lib/firestore';
import { Lead, Email } from '@/types';
import { generateWithFallback } from '@/lib/ai';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const CLASSIFICATION_PROMPT = `
You are an expert B2B sales development representative (SDR) and email intent analyzer. Your objective is to read incoming email replies from cold outreach campaigns and classify the recipient's intent with absolute precision.

You must output ONLY valid JSON. No markdown formatting, no conversational text before or after the JSON.

### CLASSIFICATION CATEGORIES:
You must categorize the email into exactly ONE of the following intents:
1. "POSITIVE_INTEREST" - The prospect wants to book a call, asked for a demo, or expressed clear buying intent.
2. "MORE_INFO_REQUESTED" - The prospect is slightly interested but needs specific questions answered (e.g., pricing, competitor comparisons, features) before committing.
3. "NOT_INTERESTED" - The prospect explicitly said no, asked to be unsubscribed, or told you to stop emailing them.
4. "OUT_OF_OFFICE" - Automated auto-responders indicating the person is away.
5. "BOUNCE" - Mail delivery subsystem errors or "address not found" automated messages.
6. "UNKNOWN" - The email is illegible, empty, or does not fit any category.

### OUTPUT JSON SCHEMA:
{
  "intent": "EXACT_CATEGORY_STRING",
  "summary": "A 1-sentence summary of what the prospect said.",
  "action_required": true/false // True if a human needs to reply manually (e.g., questions, interest). False for OOO, bounces, or rejections.
}

### INCOMING EMAIL TO ANALYZE:
`;

export async function POST(req: Request) {
  try {
    // Resend Inbound Webhook Payload structure
    // See: https://resend.com/docs/knowledge-base/how-to-receive-inbound-emails
    const payload = await req.json();

    // Handle Resend Event Webhooks (e.g., email.opened, email.bounced, email.received)
    let emailData = payload;

    if (payload.type) {
      if (payload.type === 'email.opened') {
        const resendMessageId = payload.data?.email_id;
        if (resendMessageId) {
          const allEmails = await fetchAll<Email>('emails');
          const emailDoc = allEmails.find(e => e.resendMessageId === resendMessageId);
          if (emailDoc && !emailDoc.opened) {
             await updateDocument('emails', emailDoc.id, {
                opened: true,
                openedAt: new Date().toISOString()
             });
          }
        }
        return NextResponse.json({ success: true });
      } else if (payload.type === 'email.received') {
        // Resend sends inbound emails wrapped in an event structure if configured via Webhooks
        emailData = payload.data;
        
        // The event payload only contains metadata. We must fetch the full email body using the SDK.
        if (emailData?.email_id) {
          try {
            const { data, error } = await resend.emails.get(emailData.email_id);
            if (data) {
              emailData.text = data.text || '';
              emailData.html = data.html || '';
              
              // DEBUG: If both are empty, log the entire payload so we can see what Resend gave us
              if (!emailData.text && !emailData.html) {
                 emailData.text = `[DEBUG] Resend API returned: ${JSON.stringify(data, null, 2)}`;
              }
            } else if (error) {
              console.error('Error fetching full email from Resend:', error);
              emailData.text = `[DEBUG] Resend API Error: ${JSON.stringify(error, null, 2)}`;
            }
            }
          } catch (err) {
            console.error('Failed to fetch full email body:', err);
          }
        }
      } else {
        // Always return 200 OK for other Resend events so the webhook doesn't fail
        return NextResponse.json({ success: true });
      }
    }
    
    // Handle Resend Inbound Email Webhook (Raw parsed email)
    // Basic verification (in production you would verify the Resend signature)
    if (!emailData || !emailData.from) {
      return NextResponse.json({ error: 'Invalid payload missing from address' }, { status: 400 });
    }

    const fromEmail = emailData.from.toLowerCase();
    const subject = emailData.subject || 'No Subject';
    // The payload.data might contain text, html, or neither if it's just metadata
    const bodyText = emailData.text || emailData.html || 'No body content available in payload';

    // 1. Find the Lead by email
    // Note: We use fetchAll here to query since we don't know the ID
    // In a real server environment, we'd use admin SDK to query where('email', '==', fromEmail)
    // For this MVP, we fetch all leads and find it. 
    const allLeads = await fetchAll<Lead>('leads');
    const lead = allLeads.find(l => l.email.toLowerCase().includes(fromEmail) || fromEmail.includes(l.email.toLowerCase()));

    if (!lead) {
      console.warn(`Received inbound email from unknown lead: ${fromEmail}`);
      return NextResponse.json({ success: true, message: 'Lead not found, ignoring.' });
    }

    // 2. Classify the intent via Gemini or Fallback
    const prompt = `${CLASSIFICATION_PROMPT}\n${bodyText}`;
    
    let intentData = {
      intent: 'UNKNOWN',
      summary: 'Failed to parse AI intent',
      action_required: true
    };

    try {
      intentData = await generateWithFallback(prompt, true);
    } catch (err) {
      console.error('Failed to classify inbound email:', err);
    }

    // 3. Create the inbound Email record
    await createDocument<Email>('emails', {
      leadId: lead.id,
      campaignId: lead.campaignId,
      direction: 'inbound',
      subject: subject,
      body: bodyText, // using raw text for MVP
      status: 'delivered',
      intent: intentData.intent as any,
      intentSummary: intentData.summary,
      actionRequired: intentData.action_required,
    });

    // 4. AUTOMATED CRM ROUTING: Update the Lead's status based on reply
    let newStatus = lead.status;
    if (intentData.intent === 'POSITIVE_INTEREST' || intentData.intent === 'MORE_INFO_REQUESTED') {
      newStatus = 'replied'; // Or 'qualified' if you want
    } else if (intentData.intent === 'NOT_INTERESTED') {
      newStatus = 'lost';
    } else if (intentData.intent !== 'BOUNCE' && intentData.intent !== 'OUT_OF_OFFICE') {
      newStatus = 'replied'; // Default for other generic replies
    }

    if (newStatus !== lead.status) {
      await updateDocument('leads', lead.id, { status: newStatus });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error handling inbound webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
