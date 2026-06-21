import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Email, Campaign } from '@/types';

export async function POST(request: Request) {
  try {
    const now = new Date();
    
    // In Firebase, we can query by status and scheduledAt
    const q = query(
      collection(db, 'emails'), 
      where('status', '==', 'scheduled'),
      where('scheduledAt', '<=', Timestamp.fromDate(now))
    );
    
    const snap = await getDocs(q);
    const emailsToSend = snap.docs.map(d => ({ id: d.id, ...d.data() } as Email));

    let sentCount = 0;

    for (const email of emailsToSend) {
      // 1. Fetch Lead to get the email address
      const leadSnap = await getDoc(doc(db, 'leads', email.leadId));
      if (!leadSnap.exists()) continue;
      const lead = leadSnap.data();

      // 2. Send via Resend
      const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
      const sendRes = await fetch(`${baseUrl}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          subject: email.subject,
          body: email.body
        })
      });

      if (sendRes.ok) {
        const sendData = await sendRes.json();
        
        // 3. Update Email Document
        await updateDoc(doc(db, 'emails', email.id), {
          status: 'sent',
          sentAt: Timestamp.fromDate(new Date()),
          resendMessageId: sendData.messageId || null
        });

        // 4. Update Campaign Stats
        if (email.campaignId) {
          const campaignSnap = await getDoc(doc(db, 'campaigns', email.campaignId));
          if (campaignSnap.exists()) {
            const campaign = campaignSnap.data() as Campaign;
            await updateDoc(doc(db, 'campaigns', email.campaignId), {
              'stats.sent': (campaign.stats?.sent || 0) + 1
            });
          }
        }

        sentCount++;
      } else {
        // Mark as failed
        await updateDoc(doc(db, 'emails', email.id), {
          status: 'failed'
        });
      }
    }

    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Send scheduled error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
