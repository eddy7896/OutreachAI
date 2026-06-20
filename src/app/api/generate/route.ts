import { NextResponse } from 'next/server';
import { resolvePlaceholders } from '@/utils/placeholders';
import { generateWithFallback } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const { lead, productContext, template } = await req.json();

    if (!lead || !template) {
      return NextResponse.json({ error: 'Missing lead or template' }, { status: 400 });
    }

    // Step 1: Pre-fill what we can using exact variable mapping
    const prefilledSubject = resolvePlaceholders(template.subject, lead);
    const prefilledBody = resolvePlaceholders(template.body, lead);

    // If no product context is provided and we just want simple variable replacement
    if (!productContext || !productContext.name) {
      return NextResponse.json({
        subject: prefilledSubject,
        body: prefilledBody,
      });
    }

    // Step 2: Use AI to enrich the pre-filled template with product context
    const prompt = `
You are an expert B2B sales development representative (SDR). 
Your objective is to finalize a cold outreach email based on a provided template, lead data, and product context.

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

BASE TEMPLATE (Variables pre-filled where possible):
Subject: ${prefilledSubject}
Body: 
${prefilledBody}

INSTRUCTIONS:
1. Review the Base Template. Ensure it flows naturally.
2. If the Base Template has any remaining unfilled placeholders or awkward transitions, fix them using the Prospect and Product contexts.
3. If the template is very basic (e.g. just a skeleton), expand it slightly to incorporate the Product Value Proposition that is most relevant to the prospect's Industry and Job Title.
4. DO NOT change the core message or tone of the Base Template, just polish it and make it highly personalized.
5. Keep it concise.
6. Output ONLY valid JSON in the exact format below, with no markdown formatting or extra text.

OUTPUT SCHEMA:
{
  "subject": "The polished email subject line",
  "body": "The HTML formatted email body (use <br> for line breaks and <p> for paragraphs)"
}
    `;

    try {
      const parsedData = await generateWithFallback(prompt, true);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error('Failed to parse AI output:', parseError);
      return NextResponse.json({ error: 'Failed to generate or parse AI output' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in generate API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
