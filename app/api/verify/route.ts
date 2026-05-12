// Verifies a single email address and optionally updates its DB status.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyEmail } from '@/lib/smtp-verify';

export const runtime = 'nodejs';

const STATUS_MAP = {
  valid:     'VALID',
  invalid:   'INVALID',
  catch_all: 'CATCH_ALL',
  no_mx:     'INVALID',
  timeout:   'UNKNOWN',
  blocked:   'UNKNOWN',
  dns_only:  'UNKNOWN',
} as const;

export async function POST(req: NextRequest) {
  const { email, leadId } = await req.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  const result = await verifyEmail(email);

  if (leadId) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { emailStatus: STATUS_MAP[result.reason] },
    });
  }

  return NextResponse.json(result);
}
