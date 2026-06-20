import { NextResponse } from 'next/server';
import { fetchAll } from '@/lib/firestore';
import { where } from 'firebase/firestore';
import { Lead } from '@/types';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required for enrichment' }, { status: 400 });
    }

    // Check if the user has an API key configured (we'll check for either Apollo or Hunter)
    const apolloKey = process.env.APOLLO_API_KEY;
    const hunterKey = process.env.HUNTER_API_KEY;

    let enrichedData: any = {};

    // 1. Search through the Extension directories database (Local Firestore leads)
    try {
      const existingLeads = await fetchAll<Lead>('leads', where('email', '==', email));
      if (existingLeads.length > 0) {
        const lead = existingLeads[0];
        // Only consider it a successful local enrichment if we actually have some data
        if (lead.firstName || lead.company) {
          enrichedData = {
            firstName: lead.firstName || '',
            lastName: lead.lastName || '',
            company: lead.company || '',
            jobTitle: lead.jobTitle || '',
            industry: lead.industry || '',
            phone: lead.phone || '',
          };
        }
      }
    } catch (err) {
      console.error('Local DB Search Error:', err);
    }

    // 2. Search through Hunter (if not found in DB)
    if (hunterKey && !enrichedData.firstName) {
      try {
        const hunterRes = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${hunterKey}`);
        if (hunterRes.ok) {
          const hunterData = await hunterRes.json();
          const data = hunterData.data;
          if (data && (data.first_name || data.company)) {
            enrichedData = {
              firstName: data.first_name || '',
              lastName: data.last_name || '',
              company: data.company || '',
              jobTitle: '',
              industry: '',
              phone: '',
            };
          }
        }
      } catch (err) {
        console.error('Hunter API Error:', err);
      }
    }

    // 3. Search through Apollo (if not found in DB or Hunter)
    if (apolloKey && !enrichedData.firstName) {
      try {
        const apolloRes = await fetch('https://api.apollo.io/api/v1/people/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({ api_key: apolloKey, email })
        });
        
        if (apolloRes.ok) {
          const apolloData = await apolloRes.json();
          const person = apolloData.person;
          if (person && (person.first_name || person.organization?.name)) {
            enrichedData = {
              firstName: person.first_name || '',
              lastName: person.last_name || '',
              company: person.organization?.name || '',
              jobTitle: person.title || '',
              industry: person.organization?.industry || '',
              phone: person.phone_numbers?.[0]?.sanitized_number || person.organization?.primary_phone?.sanitized_number || '',
            };
          }
        }
      } catch (err) {
        console.error('Apollo API Error:', err);
      }
    }

    // If no data was found or no keys were configured
    if (!enrichedData.firstName && !enrichedData.company) {
      return NextResponse.json({ success: false, error: 'No data found for this email. Check your API keys.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: enrichedData });

  } catch (error: any) {
    console.error('Enrichment Error:', error);
    return NextResponse.json({ error: 'Failed to enrich lead' }, { status: 500 });
  }
}
