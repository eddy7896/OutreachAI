import { NextResponse } from 'next/server';
import { fetchAll, fetchOne, createDocument, updateDocument } from '@/lib/firestore';
import { Campaign, Lead, Sequence, SequenceNode, Product, EmailTemplate, Email, Signature } from '@/types';
import { Resend } from 'resend';

// Vercel Cron routes can optionally verify a secret header to prevent unauthorized runs
const CRON_SECRET = process.env.CRON_SECRET || '';

export async function GET(req: Request) {
  try {
    // 1. Verify Cron Secret if it's set in env (Standard Vercel practice)
    if (CRON_SECRET) {
      const authHeader = req.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    console.log('--- Starting Hourly Sequence Cron Job ---');

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

    let actionsTaken = 0;

    for (const campaign of activeCampaigns) {
      const sequence = allSequences.find(s => s.id === campaign.sequenceId);
      const product = allProducts.find(p => p.id === campaign.targetProduct);

      if (!sequence) continue;

      // Find eligible leads for this campaign
      // Exclude leads that have replied or finished
      const eligibleLeads = allLeads.filter(l => 
        l.campaignId === campaign.id && 
        l.status !== 'replied' && 
        l.status !== 'qualified' && 
        l.status !== 'lost' && 
        l.status !== 'converted'
      );

      for (const lead of eligibleLeads) {
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
          // Reached an invalid state, mark complete
          await updateDocument('leads', lead.id, { currentSequenceNodeId: undefined });
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
            const nextNodeId = currentNode.children?.[0]?.nodeId;
            await updateDocument('leads', lead.id, {
              currentSequenceNodeId: nextNodeId,
              sequenceLastActionAt: new Date()
            });
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
          if (template && product) {
            try {
              // 1. Ask Gemini to generate it
              const origin = new URL(req.url).origin;
              const genResponse = await fetch(`${origin}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lead, productContext: product, template }),
              });
              const genData = await genResponse.json();

              if (genResponse.ok && genData.subject && genData.body) {
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

                const sendResponse = await fetch(`${origin}/api/send`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: lead.email, subject: genData.subject, body: finalBody }),
                });
                const sendData = await sendResponse.json();

                // 4. Update Email doc with final details
                await updateDocument('emails', newEmail.id, {
                  body: finalBody,
                  resendMessageId: sendData.messageId || undefined,
                });

                // 5. Move Lead to next node
                const nextNodeId = currentNode.children?.[0]?.nodeId;
                await updateDocument('leads', lead.id, {
                  currentSequenceNodeId: nextNodeId,
                  sequenceLastActionAt: new Date(),
                  status: lead.status === 'new' ? 'contacted' : lead.status // Update status if first touch
                });
                actionsTaken++;
              }
            } catch (err) {
              console.error(`Failed to execute email step for lead ${lead.id}:`, err);
            }
          } else {
             // Missing template or product, skip and warn
             console.warn(`Missing template or product for campaign ${campaign.id}`);
          }
        }
        else if (currentNode.type === 'condition') {
          // MVP logic: Since the webhook already pulls leads out of active sequence if they reply,
          // the fact that they reached this condition node means they have NOT replied.
          // So if condition is 'reply_received', we evaluate to FALSE.
          // (In a more complex system, we'd check the exact timeframe or logic)
          
          let nextNodeId = undefined;
          if (currentNode.conditionType === 'reply_received') {
            // They haven't replied (otherwise status would be 'replied' and they'd be filtered out above)
            const falseBranch = currentNode.children?.find(c => c.branchLabel.toLowerCase() === 'false');
            nextNodeId = falseBranch?.nodeId;
          } else {
            // Default to first child for unknown conditions
            nextNodeId = currentNode.children?.[0]?.nodeId;
          }

          await updateDocument('leads', lead.id, {
            currentSequenceNodeId: nextNodeId,
            sequenceLastActionAt: new Date()
          });
          actionsTaken++;
        }
        else if (currentNode.type === 'end') {
          // Reached the end of the sequence
          await updateDocument('leads', lead.id, {
            currentSequenceNodeId: undefined, // Clear it
          });
          actionsTaken++;
        }
      }
    }

    console.log(`--- Finished Hourly Sequence Cron Job. Actions taken: ${actionsTaken} ---`);
    return NextResponse.json({ success: true, actionsTaken });

  } catch (error: any) {
    console.error('Error in Sequence Cron:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
