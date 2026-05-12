// Enriches all leads in a search session that have a domain but no email yet.
// Runs sequentially to avoid hammering mail servers.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmailCandidates, parseName } from '@/lib/email-patterns';
import { verifyEmail } from '@/lib/smtp-verify';
import { hasMx } from '@/lib/mx-lookup';

export const runtime = 'nodejs';

const STATUS_MAP = {
  valid:     'VALID',
  dns_only:  'UNKNOWN',
  catch_all: 'CATCH_ALL',
} as const;

export async function POST(req: NextRequest) {
  const { searchId } = await req.json();
  if (!searchId) return NextResponse.json({ error: 'searchId required' }, { status: 400 });

  const leads = await prisma.lead.findMany({
    where: {
      searchId,
      email: null,
      domain: { not: null },
      name:   { not: null },
    },
  });

  let enriched = 0;
  let failed   = 0;

  for (const lead of leads) {
    const parsed = parseName(lead.name!);
    if (!parsed || !(await hasMx(lead.domain!))) { failed++; continue; }

    const candidates = generateEmailCandidates(parsed, lead.domain!);
    let found = false;

    for (const candidate of candidates) {
      const result = await verifyEmail(candidate);
      if (result.valid) {
        const emailStatus = STATUS_MAP[result.reason as keyof typeof STATUS_MAP] ?? 'UNKNOWN';
        await prisma.lead.update({
          where: { id: lead.id },
          data: { email: candidate, source: 'ENRICHED', emailStatus },
        });
        enriched++;
        found = true;
        break;
      }
    }

    if (!found) failed++;
  }

  return NextResponse.json({ enriched, failed, total: leads.length });
}
