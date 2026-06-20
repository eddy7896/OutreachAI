import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai';

export const maxDuration = 60; // 60 seconds maximum duration for LLM APIs

const TEMPLATE_PROMPT = `
You are an expert B2B copywriter and sales strategist.
Your objective is to create a highly effective cold email template based on the provided intent.

CRITICAL INSTRUCTIONS:
1. You MUST use EXACTLY these placeholders for dynamic data instead of generating fake names:
   {{firstName}} - The prospect's first name
   {{lastName}} - The prospect's last name
   {{company}} - The prospect's company name
   {{productName}} - The name of our product/service

2. Use HTML tags (<p>, <br>, <strong>, etc.) for formatting the body. Do not use Markdown inside the body string.
3. Keep the email concise, persuasive, and professional.
4. Output ONLY valid JSON containing "subject" and "body" properties.

OUTPUT SCHEMA:
{
  "subject": "The email subject line",
  "body": "The HTML formatted body of the email using {{placeholders}}"
}

INTENT / PURPOSE OF THE EMAIL:
`;

export async function POST(req: Request) {
  try {
    const { intent } = await req.json();

    if (!intent) {
      return NextResponse.json({ error: 'Missing intent prompt' }, { status: 400 });
    }

    const prompt = `${TEMPLATE_PROMPT}\n${intent}`;

    const data = await generateWithFallback(prompt, true);

    if (!data.subject || !data.body) {
      throw new Error('AI returned invalid JSON structure.');
    }

    return NextResponse.json({ success: true, subject: data.subject, body: data.body });
  } catch (error: any) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
