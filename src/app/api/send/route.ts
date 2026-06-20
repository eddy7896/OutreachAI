import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { fetchOne } from '@/lib/firestore';
import { AppSettings } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { emailId, to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the settings to get the dynamic sender email
    const settings = await fetchOne<AppSettings>('settings', 'global');
    const senderEmail = settings?.profile?.senderEmail;

    let fromEmail = 'onboarding@resend.dev';
    if (senderEmail) {
      fromEmail = senderEmail;
    } else if (process.env.NODE_ENV !== 'development') {
      fromEmail = 'hello@yourdomain.com'; // fallback if no setting exists
    }

    const data = await resend.emails.send({
      from: `Outreach AI <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: body,
    });

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, messageId: data.data?.id });
  } catch (error: any) {
    console.error('Error sending email via Resend:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
