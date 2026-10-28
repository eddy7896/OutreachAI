import { NextResponse } from 'next/server';
import { generateEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { lead, productContext, template } = await req.json();

    if (!lead || !template) {
      return NextResponse.json({ error: 'Missing lead or template' }, { status: 400 });
    }

    try {
      return NextResponse.json(await generateEmail({ lead, productContext, template }));
    } catch (parseError) {
      console.error('Failed to parse AI output:', parseError);
      return NextResponse.json({ error: 'Failed to generate or parse AI output' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in generate API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
