import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Campaign, Sequence, Lead, SequenceNode, Email, Product, EmailTemplate } from '@/types';
import { getNextValidSendTime } from '@/lib/scheduling';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const specificCampaignId = url.searchParams.get('campaignId');

    let processedCount = 0;

    // 1. Fetch active campaigns
    const campaignsQuery = query(collection(db, 'campaigns'), where('status', '==', 'active'));
    const campaignsSnap = await getDocs(campaignsQuery);
    const campaigns = campaignsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));

    const targetCampaigns = specificCampaignId 
      ? campaigns.filter(c => c.id === specificCampaignId)
      : campaigns.filter(c => !!c.sequenceId);

    // Prepare lookups
    const sequencesSnap = await getDocs(collection(db, 'sequences'));
    const sequences = sequencesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sequence));

    const productsSnap = await getDocs(collection(db, 'products'));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

    const templatesSnap = await getDocs(collection(db, 'templates'));
    const templates = templatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmailTemplate));

    for (const campaign of targetCampaigns) {
      if (!campaign.sequenceId) continue;
      
      const sequence = sequences.find(s => s.id === campaign.sequenceId);
      if (!sequence) continue;

      const product = products.find(p => p.name === campaign.targetProduct);

      // Fetch leads for this campaign
      const leadsQuery = query(collection(db, 'leads'), where('campaignId', '==', campaign.id));
      const leadsSnap = await getDocs(leadsQuery);
      const leads = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));

      for (const lead of leads) {
        // Stop processing if lead has reached a terminal status manually
        if (lead.contactStatus === 'Meeting Booked' || lead.contactStatus === 'Not Interested' || lead.status === 'lost') {
          continue;
        }

        const currentNodeId = lead.currentSequenceNodeId || sequence.rootNodeId;
        const currentNode = sequence.nodes.find(n => n.id === currentNodeId);
        
        if (!currentNode) continue; // Sequence might have changed or ended

        let nextNodeId = currentNodeId;
        let actionTaken = false;

        const lastActionDate = lead.sequenceLastActionAt 
          ? (lead.sequenceLastActionAt as Timestamp).toDate() 
          : (lead.createdAt as Timestamp).toDate();

        const now = new Date();

        if (currentNode.type === 'delay') {
          const delayDays = currentNode.delayDays || 1;
          const waitMillis = delayDays * 24 * 60 * 60 * 1000;
          if (now.getTime() - lastActionDate.getTime() >= waitMillis) {
            nextNodeId = currentNode.children[0]?.nodeId || null;
            actionTaken = true;
          }
        } 
        else if (currentNode.type === 'condition') {
          // Check for replies since last action
          const emailsQuery = query(collection(db, 'emails'), where('leadId', '==', lead.id));
          const emailsSnap = await getDocs(emailsQuery);
          const emails = emailsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Email));
          
          const recentReplies = emails.filter(e => 
            e.direction === 'inbound' && 
            (e.createdAt as Timestamp).toDate().getTime() > lastActionDate.getTime()
          );

          if (recentReplies.length > 0) {
            // Found a reply, follow "Yes" branch
            const yesBranch = currentNode.children.find(c => c.branchLabel === 'Yes');
            nextNodeId = yesBranch?.nodeId || null;
          } else {
            // Evaluated NO (we can assume condition nodes only evaluate after a delay node, so if it's evaluated, it's a NO)
            const noBranch = currentNode.children.find(c => c.branchLabel === 'No');
            nextNodeId = noBranch?.nodeId || null;
          }
          actionTaken = true;
        }
        else if (currentNode.type === 'email') {
          // Generate & Schedule Email
          const template = templates.find(t => t.id === currentNode.templateId);
          if (template) {
            // Determine Contact Status logic
            let newContactStatus = 'First Contact';
            if (lead.contactStatus === 'First Contact') newContactStatus = 'Follow Up 1';
            else if (lead.contactStatus === 'Follow Up 1') newContactStatus = 'Follow Up 2';
            else if (lead.contactStatus?.startsWith('Follow Up')) newContactStatus = `Follow Up ${parseInt(lead.contactStatus.replace('Follow Up ', '')) + 1}`;

            // Calculate Scheduled Time based on Campaign Timezone
            const scheduleWindow = campaign.scheduleWindow || { startHour: 9, endHour: 17, days: [1,2,3,4,5] };
            const timezone = campaign.timezone || 'America/New_York';
            const scheduledTime = getNextValidSendTime(now, timezone, scheduleWindow);

            // Payload for Generation
            const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
            const genRes = await fetch(`${baseUrl}/api/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lead, productContext: product, template })
            });
            const genData = await genRes.json();

            await addDoc(collection(db, 'emails'), {
              leadId: lead.id,
              campaignId: campaign.id,
              direction: 'outbound',
              subject: genData.subject || `Outreach`,
              body: genData.body || '',
              status: 'scheduled',
              scheduledAt: Timestamp.fromDate(scheduledTime),
              createdAt: serverTimestamp(),
            });

            // Update Lead
            await updateDoc(doc(db, 'leads', lead.id), {
              contactStatus: newContactStatus,
              status: 'contacted'
            });
            
            nextNodeId = currentNode.children[0]?.nodeId || null;
            actionTaken = true;
          }
        }
        else if (currentNode.type === 'end') {
          nextNodeId = null; // Mark as done
        }

        if (actionTaken && nextNodeId !== currentNodeId) {
          await updateDoc(doc(db, 'leads', lead.id), {
            currentSequenceNodeId: nextNodeId,
            sequenceLastActionAt: serverTimestamp()
          });
          processedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, processedCount });
  } catch (error: any) {
    console.error('Process sequence error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
