import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();
const db = admin.firestore();

// Ensure you set the Resend API key in Firebase Functions environment:
// firebase functions:config:set resend.api_key="YOUR_KEY"
const resendApiKey = functions.config().resend?.api_key || process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

/**
 * Scheduled Cloud Function: Runs once a day to send a batch of draft emails.
 * The user requested a max of 20-30 emails a day.
 * We'll limit it to 25 emails per execution.
 */
export const processScheduledSends = functions.pubsub
  .schedule('every 24 hours') // e.g. '0 9 * * *' for 9 AM daily
  .onRun(async (context) => {
    try {
      if (!resendApiKey) {
        console.error('RESEND_API_KEY is not configured.');
        return null;
      }

      // 1. Query for pending drafts, limit to 25.
      const emailsSnapshot = await db.collection('emails')
        .where('status', '==', 'draft')
        .orderBy('createdAt', 'asc')
        .limit(25)
        .get();

      if (emailsSnapshot.empty) {
        console.log('No pending draft emails to send.');
        return null;
      }

      console.log(`Found ${emailsSnapshot.size} draft emails. Starting batch send...`);

      // 2. Iterate and send
      const batch = db.batch();
      
      for (const doc of emailsSnapshot.docs) {
        const emailData = doc.data();
        const { leadId, subject, body } = emailData;

        // Fetch lead to get the email address
        const leadDoc = await db.collection('leads').doc(leadId).get();
        if (!leadDoc.exists) {
          console.error(`Lead ${leadId} not found for email ${doc.id}`);
          batch.update(doc.ref, { status: 'failed', error: 'Lead not found' });
          continue;
        }

        const leadData = leadDoc.data();
        const toAddress = leadData?.email;

        if (!toAddress) {
          console.error(`Lead ${leadId} missing email address`);
          batch.update(doc.ref, { status: 'failed', error: 'Missing email address' });
          continue;
        }

        // Send via Resend
        try {
          const sendResult = await resend.emails.send({
            from: 'Outreach AI <hello@yourdomain.com>', // Update to verified domain
            to: [toAddress],
            subject: subject || 'No Subject',
            html: body || 'No Content',
          });

          if (sendResult.error) {
            console.error(`Failed to send email ${doc.id}:`, sendResult.error);
            batch.update(doc.ref, { status: 'failed', error: sendResult.error.message });
          } else {
            console.log(`Email ${doc.id} sent successfully.`);
            batch.update(doc.ref, { 
              status: 'sent', 
              resendMessageId: sendResult.data?.id,
              sentAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Also update campaign stats if this email belongs to a campaign
            if (emailData.campaignId) {
              const campaignRef = db.collection('campaigns').doc(emailData.campaignId);
              batch.update(campaignRef, {
                'stats.sent': admin.firestore.FieldValue.increment(1)
              });
            }
          }
        } catch (err: any) {
          console.error(`Exception sending email ${doc.id}:`, err);
          batch.update(doc.ref, { status: 'failed', error: err.message });
        }
      }

      // 3. Commit the status updates to Firestore
      await batch.commit();
      console.log('Batch processing completed.');

    } catch (error) {
      console.error('Fatal error in processScheduledSends:', error);
    }
    
    return null;
  });
