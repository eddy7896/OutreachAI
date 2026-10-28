import { NextResponse } from 'next/server';
import { EmailRejectedError, sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { messageId } = await sendEmail({ to, subject, html: body });
    return NextResponse.json({ success: true, messageId });
  } catch (error: any) {
    if (error instanceof EmailRejectedError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error sending email via Resend:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
