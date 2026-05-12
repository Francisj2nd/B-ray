import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const searches = await prisma.search.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      _count: { select: { leads: true } },
    },
  });

  const withStats = await Promise.all(
    searches.map(async s => {
      const withEmail = await prisma.lead.count({
        where: { searchId: s.id, email: { not: null } },
      });
      const verified = await prisma.lead.count({
        where: { searchId: s.id, emailStatus: 'VALID' },
      });
      return { ...s, withEmail, verified };
    })
  );

  return NextResponse.json(withStats);
}
