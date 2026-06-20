import { NextResponse } from 'next/server';
import { createDocument } from '@/lib/firestore';
import { Lead } from '@/types';

export async function POST(req: Request) {
  try {
    const { company } = await req.json();

    if (!company) {
      return NextResponse.json({ error: 'Company name or domain is required' }, { status: 400 });
    }

    const hunterKey = process.env.HUNTER_API_KEY;
    if (!hunterKey) {
      return NextResponse.json({ error: 'HUNTER_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    // Call Hunter Domain Search API with limit=10
    const hunterUrl = `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company)}&limit=10&api_key=${hunterKey}`;
    const res = await fetch(hunterUrl);
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error('Hunter API Error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch from Hunter API' }, { status: 500 });
    }

    const data = await res.json();
    
    if (!data.data || !data.data.emails || data.data.emails.length === 0) {
      return NextResponse.json({ success: true, importedCount: 0, message: 'No employees found for this company' });
    }

    const emails = data.data.emails;
    const actualCompanyName = data.data.organization || company;
    const industry = data.data.industry || 'Unknown';
    let importedCount = 0;

    for (const person of emails) {
      try {
        const newLead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
          firstName: person.first_name || 'Unknown',
          lastName: person.last_name || '',
          email: person.value,
          company: actualCompanyName,
          jobTitle: person.position || '',
          industry: industry,
          phone: person.phone_number || '',
          targetProduct: 'Default',
          remarks: 'Bulk imported via Hunter Company Search',
          status: 'new',
        };

        await createDocument<Lead>('leads', newLead as Lead);
        importedCount++;
      } catch (err) {
        console.error('Error saving imported lead:', err);
      }
    }

    return NextResponse.json({ success: true, importedCount });

  } catch (error: any) {
    console.error('Bulk Enrichment Error:', error);
    return NextResponse.json({ error: 'Failed to process bulk enrichment' }, { status: 500 });
  }
}
