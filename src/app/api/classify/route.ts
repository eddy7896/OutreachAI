import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai';

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
    const { emailText } = await req.json();

    if (!emailText) {
      return NextResponse.json({ error: 'Missing email content' }, { status: 400 });
    }

    const prompt = `${CLASSIFICATION_PROMPT}\n${emailText}`;

    try {
      const parsedData = await generateWithFallback(prompt, true);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Failed to parse AI classification response:', parseError);
      return NextResponse.json({ error: 'Failed to classify email' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in classify API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
