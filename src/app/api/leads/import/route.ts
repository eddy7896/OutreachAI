import { NextResponse } from 'next/server';
import { createDocument } from '@/lib/firestore';
import { Lead } from '@/types';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedKey = process.env.EXTENSION_API_KEY;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leadData = await req.json();
    let { firstName, lastName, company, jobTitle, industry, email, remarks } = leadData;

    if (!firstName || !company) {
      return NextResponse.json({ error: 'First name and company are required' }, { status: 400 });
    }

    // Attempt to guess email if it wasn't found on the LinkedIn page
    if (!email) {
      const hunterKey = process.env.HUNTER_API_KEY;
      const apolloKey = process.env.APOLLO_API_KEY;

      if (hunterKey) {
        try {
          const res = await fetch(`https://api.hunter.io/v2/email-finder?company=${encodeURIComponent(company)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName || '')}&api_key=${hunterKey}`);
          if (res.ok) {
            const data = await res.json();
            if (data.data && data.data.email) {
              email = data.data.email;
              remarks = (remarks ? remarks + '\n' : '') + 'Email automatically found via Hunter.io';
            }
          }
        } catch (err) {
          console.error('Hunter Email Finder Error:', err);
        }
      } else if (apolloKey && !email) {
        try {
          const res = await fetch('https://api.apollo.io/api/v1/people/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            body: JSON.stringify({ api_key: apolloKey, first_name: firstName, last_name: lastName, organization_name: company })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.person && data.person.email) {
              email = data.person.email;
              remarks = (remarks ? remarks + '\n' : '') + 'Email automatically found via Apollo.io';
            }
          }
        } catch (err) {
          console.error('Apollo Email Finder Error:', err);
        }
      }
    }

    // Default to a placeholder if absolutely no email could be found
    if (!email) {
      email = `unknown_${Date.now()}@needs-enrichment.com`;
      remarks = (remarks ? remarks + '\n' : '') + 'Email not found. Please update manually.';
    }

    const newLead = await createDocument<Lead>('leads', {
      firstName,
      lastName: lastName || '',
      company,
      jobTitle: jobTitle || '',
      industry: industry || 'Unknown',
      email,
      phone: leadData.phone || '',
      targetProduct: 'Default', // User can update this later in the UI
      remarks: remarks || 'Imported from LinkedIn Chrome Extension',
      status: 'new',
    });

    return NextResponse.json({ success: true, lead: newLead });
  } catch (error: any) {
    console.error('Error importing lead:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
