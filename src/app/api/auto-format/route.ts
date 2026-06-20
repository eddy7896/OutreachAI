import { NextResponse } from 'next/server';
import { generateWithFallback } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { lead, productContext } = await req.json();

    if (!lead || !productContext) {
      return NextResponse.json({ error: 'Missing lead or product context' }, { status: 400 });
    }

    const prompt = `
You are an expert B2B sales development representative (SDR). 
Your objective is to write a highly personalized, concise cold outreach email for a prospect.

PROSPECT CONTEXT:
Name: ${lead.firstName} ${lead.lastName}
Company: ${lead.company}
Job Title: ${lead.jobTitle || 'Unknown'}
Industry: ${lead.industry}
Remarks/Notes: ${lead.remarks || 'None'}

PRODUCT WE ARE PITCHING:
Product Name: ${productContext.name}
Description: ${productContext.description}
Value Proposition: ${productContext.valueProposition}
Key Features: ${productContext.keyFeatures?.join(', ') || 'None specified'}
Target Audience: ${productContext.targetAudience}

INSTRUCTIONS:
1. Write a subject line and email body.
2. The email must be highly personalized to the prospect's industry and job title.
3. Keep it concise (under 150 words). Focus on the value proposition.
4. Output ONLY valid JSON in the exact format below, with no markdown formatting or extra text.

OUTPUT SCHEMA:
{
  "subject": "The email subject line",
  "body": "The HTML formatted email body (use <br> for line breaks and <p> for paragraphs)"
}
    `;

    const parsedData = await generateWithFallback(prompt, true);
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error in auto-format API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
