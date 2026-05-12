import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const search = await prisma.search.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const leads = await prisma.lead.findMany({
    where: { searchId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ search, leads });
}
