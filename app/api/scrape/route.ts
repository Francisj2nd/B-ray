// Receives emails POSTed by the browser bookmarklet.
// Tries to match each email to an existing Discovery Engine lead in the same
// search session. Unmatched emails are saved as standalone scraper leads.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { matchEmailToLead, type ScrapedEmail } from '@/lib/lead-matcher';

const CORS = { 'Access-Control-Allow-Origin': '*' };

// Preflight for cross-origin bookmarklet requests
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      ...CORS,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  const { leads: scrapedLeads, searchId } = (await req.json()) as {
    leads: ScrapedEmail[];
    searchId?: string;
  };

  if (!scrapedLeads?.length) {
    return NextResponse.json({ saved: 0, matched: 0 }, { headers: CORS });
  }

  // Load existing Discovery Engine leads for this session to match against
  const existingLeads = searchId
    ? await prisma.lead.findMany({
        where: { searchId, source: 'DISCOVERY_ENGINE' },
        select: { id: true, name: true, company: true, domain: true },
      })
    : [];

  let saved = 0;
  let matched = 0;

  for (const scraped of scrapedLeads) {
    const hit = matchEmailToLead(scraped, existingLeads);

    if (hit) {
      await prisma.lead.update({
        where: { id: hit.id },
        data: { email: scraped.Email, source: 'ENRICHED' },
      });
      matched++;
    } else {
      try {
        await prisma.lead.create({
          data: {
            name: scraped.BusinessName !== 'Title Not Found' ? scraped.BusinessName : null,
            email: scraped.Email,
            snippet: scraped.Snippet,
            source: 'SCRAPER',
            searchId: searchId ?? null,
          },
        });
        saved++;
      } catch {
        // Duplicate email in this session — skip
      }
    }
  }

  return NextResponse.json({ saved, matched }, { headers: CORS });
}
