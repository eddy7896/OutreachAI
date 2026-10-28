import { NextResponse } from 'next/server';
import { deleteField } from 'firebase/firestore';
import { fetchAll, createDocument, updateDocument } from '@/lib/firestore';
import { generateEmail, sendEmail } from '@/lib/email';
import { Campaign, Lead, Sequence, Product, EmailTemplate, Email, Signature } from '@/types';

// Vercel Cron routes can optionally verify a secret header to prevent unauthorized runs
const CRON_SECRET = process.env.CRON_SECRET || '';

// Leads the user has closed out manually in the Inbox must not get more follow-ups.
const TERMINAL_CONTACT_STATUSES = ['Meeting Booked', 'Not Interested'];

// Firestore rejects `undefined` field values, so a missing next node is written as a
// deleted field, and the lead is marked complete instead of restarting from the root.
type LeadUpdate = Record<string, unknown>;

const endOfSequence = (): LeadUpdate => ({
  currentSequenceNodeId: deleteField(),
  sequenceCompletedAt: new Date(),
  sequenceLastActionAt: new Date(),
});

const advanceTo = (nextNodeId: string | undefined): LeadUpdate =>
  nextNodeId
    ? { currentSequenceNodeId: nextNodeId, sequenceLastActionAt: new Date() }
    : endOfSequence();

export async function GET(req: Request) {
  try {
    // 1. Verify Cron Secret if it's set in env (Standard Vercel practice)
    if (CRON_SECRET) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    console.log('--- Starting Sequence Cron Job ---');

    // Fetch all needed data
    const allCampaigns = await fetchAll<Campaign>('campaigns');
    const allLeads = await fetchAll<Lead>('leads');
    const allSequences = await fetchAll<Sequence>('sequences');
    const allProducts = await fetchAll<Product>('products');
    const allTemplates = await fetchAll<EmailTemplate>('templates');
    const allSignatures = await fetchAll<Signature>('signatures');

    const defaultSignature = allSignatures.find(s => s.isDefault);
    const signatureHtml = defaultSignature ? `<br/><br/>${defaultSignature.htmlContent}` : '';

    // 2. Find active campaigns with sequences
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active' && c.sequenceId);

    if (activeCampaigns.length === 0) {
      console.log('No active campaigns with sequences found.');
      return NextResponse.json({ success: true, message: 'No active campaigns' });
    }

    const origin = new URL(req.url).origin;
    let actionsTaken = 0;
    let failures = 0;

    for (const campaign of activeCampaigns) {
      const sequence = allSequences.find(s => s.id === campaign.sequenceId);
      // CampaignForm stores the product NAME in targetProduct.
      const product = allProducts.find(p => p.name === campaign.targetProduct);

      if (!sequence) continue;

      // Find eligible leads for this campaign
      // Exclude leads that have replied, finished the sequence, or were closed out manually
      const eligibleLeads = allLeads.filter(l =>
        l.campaignId === campaign.id &&
        l.status !== 'replied' &&
        l.status !== 'qualified' &&
        l.status !== 'lost' &&
        l.status !== 'converted' &&
        !l.sequenceCompletedAt &&
        !TERMINAL_CONTACT_STATUSES.includes(l.contactStatus || '')
      );

      for (const lead of eligibleLeads) {
        // One bad lead must not abort the run for everyone else.
        try {
          let currentNodeId = lead.currentSequenceNodeId;

          // If the lead hasn't started the sequence, initialize them
          if (!currentNodeId) {
            currentNodeId = sequence.rootNodeId;
            await updateDocument('leads', lead.id, {
              currentSequenceNodeId: currentNodeId,
              sequenceLastActionAt: new Date()
            });
            // Update local memory to process immediately
            lead.currentSequenceNodeId = currentNodeId;
            lead.sequenceLastActionAt = new Date();
          }

          const currentNode = sequence.nodes.find(n => n.id === currentNodeId);
          if (!currentNode) {
            // The node was removed from the sequence; finish rather than loop forever.
            console.warn(`Lead ${lead.id} points at missing node ${currentNodeId}; marking sequence complete`);
            await updateDocument('leads', lead.id, endOfSequence());
            actionsTaken++;
            continue;
          }

          // --- NODE LOGIC ---

          if (currentNode.type === 'delay') {
            // Check if delay has passed
            const delayDays = currentNode.delayDays || 1;
            const lastActionMs = (lead.sequenceLastActionAt as any)?.seconds
              ? (lead.sequenceLastActionAt as any).seconds * 1000
              : new Date(lead.sequenceLastActionAt as any).getTime();

            const msPassed = Date.now() - lastActionMs;
            const daysPassed = msPassed / (1000 * 60 * 60 * 24);

            if (daysPassed >= delayDays) {
              // Delay passed, move to next node
              await updateDocument('leads', lead.id, advanceTo(currentNode.children?.[0]?.nodeId));
              actionsTaken++;
            }
          }
          else if (currentNode.type === 'email') {
            // We need to generate and send an email
            let chosenTemplateId = currentNode.templateId;
            let variant: 'A' | 'B' = 'A';

            if (currentNode.abTestEnabled && currentNode.templateIdB) {
              if (Math.random() > 0.5) {
                chosenTemplateId = currentNode.templateIdB;
                variant = 'B';
              }
            }

            const template = allTemplates.find(t => t.id === chosenTemplateId);
            if (!template || !product) {
              // Missing template or product, skip and warn (lead stays on this node)
              console.warn(`Missing ${!template ? `template ${chosenTemplateId}` : `product "${campaign.targetProduct}"`} for campaign ${campaign.id}`);
              continue;
            }

            // 1. Ask Gemini to generate it (throws on failure; the lead is retried next run)
            const genData = await generateEmail({ lead, productContext: product, template });

            // 2. Create Email doc
            const newEmail = await createDocument<Email>('emails', {
              leadId: lead.id,
              campaignId: campaign.id,
              direction: 'outbound',
              variant,
              subject: genData.subject,
              body: genData.body,
              status: 'sent',
              opened: false,
            });

            // 3. Append signature, pixel, and Send
            const trackingPixel = `<img src="${origin}/api/track?emailId=${newEmail.id}" width="1" height="1" alt="" />`;
            const finalBody = genData.body + signatureHtml + trackingPixel;

            let sendData: { messageId?: string };
            try {
              sendData = await sendEmail({ to: lead.email, subject: genData.subject, html: finalBody });
            } catch (sendError) {
              // Record the failure and keep the lead on this node so the next run retries.
              await updateDocument('emails', newEmail.id, { body: finalBody, status: 'failed' });
              throw sendError;
            }

            // 4. Update Email doc with final details
            await updateDocument('emails', newEmail.id, {
              body: finalBody,
              ...(sendData.messageId ? { resendMessageId: sendData.messageId } : {}),
            });

            // 5. Move Lead to next node
            await updateDocument('leads', lead.id, {
              ...advanceTo(currentNode.children?.[0]?.nodeId),
              status: lead.status === 'new' ? 'contacted' : lead.status // Update status if first touch
            });
            actionsTaken++;
          }
          else if (currentNode.type === 'condition') {
            // MVP logic: Since the webhook already pulls leads out of active sequence if they reply,
            // the fact that they reached this condition node means they have NOT replied.
            // SequenceBuilder labels condition branches 'Yes' / 'No'.
            let nextNodeId: string | undefined;
            if (currentNode.conditionType === 'reply_received' || !currentNode.conditionType) {
              // They haven't replied (otherwise status would be 'replied' and they'd be filtered out above)
              nextNodeId = currentNode.children?.find(c => c.branchLabel === 'No')?.nodeId;
            } else {
              // Default to first child for unknown conditions
              nextNodeId = currentNode.children?.[0]?.nodeId;
            }

            await updateDocument('leads', lead.id, advanceTo(nextNodeId));
            actionsTaken++;
          }
          else if (currentNode.type === 'end') {
            // Reached the end of the sequence
            await updateDocument('leads', lead.id, endOfSequence());
            actionsTaken++;
          }
        } catch (err) {
          failures++;
          console.error(`Sequence step failed for lead ${lead.id} in campaign ${campaign.id}:`, err);
        }
      }
    }

    console.log(`--- Finished Sequence Cron Job. Actions taken: ${actionsTaken}, failures: ${failures} ---`);
    return NextResponse.json({ success: true, actionsTaken, failures });

  } catch (error: any) {
    console.error('Error in Sequence Cron:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
