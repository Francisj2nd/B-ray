// Given a lead (name + domain), generates email pattern candidates,
// SMTP-verifies each one, and saves the first confirmed email.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateEmailCandidates, parseName } from '@/lib/email-patterns';
import { verifyEmail } from '@/lib/smtp-verify';
import { hasMx } from '@/lib/mx-lookup';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { leadId, name, domain } = await req.json();

  if (!name || !domain) {
    return NextResponse.json({ error: 'name and domain required' }, { status: 400 });
  }

  const parsed = parseName(name);
  if (!parsed) {
    return NextResponse.json({ error: 'could not parse name into first/last' }, { status: 422 });
  }

  if (!(await hasMx(domain))) {
    return NextResponse.json({ email: null, reason: 'no_mx' });
  }

  const candidates = generateEmailCandidates(parsed, domain);

  for (const candidate of candidates) {
    const result = await verifyEmail(candidate);

    if (result.valid) {
      const statusMap = {
        valid: 'VALID',
        dns_only: 'UNKNOWN',
        catch_all: 'CATCH_ALL',
      } as const;

      const emailStatus =
        statusMap[result.reason as keyof typeof statusMap] ?? 'UNKNOWN';

      if (leadId) {
        await prisma.lead.update({
          where: { id: leadId },
          data: { email: candidate, source: 'ENRICHED', emailStatus },
        });
      }

      return NextResponse.json({
        email: candidate,
        reason: result.reason,
        confidence: result.reason === 'valid' ? 'smtp_verified' : 'dns_only',
      });
    }
  }

  return NextResponse.json({ email: null, reason: 'not_found' });
}
