import { notFound } from 'next/navigation';
import Link from 'next/link';
import { LeadsTable } from '../../components/LeadsTable';
import { BookmarkletGenerator } from '../../components/BookmarkletGenerator';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  linkedinUrl: string | null;
  company: string | null;
  domain: string | null;
  snippet: string | null;
  source: 'DISCOVERY_ENGINE' | 'SCRAPER' | 'ENRICHED';
  emailStatus: 'UNVERIFIED' | 'VALID' | 'INVALID' | 'CATCH_ALL' | 'UNKNOWN';
}

interface Search {
  id: string;
  query: string;
  createdAt: string;
}

async function getSearch(id: string): Promise<{ search: Search; leads: Lead[] } | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res    = await fetch(`${appUrl}/api/searches/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function SearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const data    = await getSearch(id);
  if (!data)    notFound();

  const { search, leads } = data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link href="/searches" className="text-sm text-gray-400 hover:text-gray-600">
          ← All searches
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900 break-words">{search.query}</h1>
        <p className="mt-1 text-xs text-gray-400">
          Created {new Date(search.createdAt).toLocaleString()} · ID: {search.id}
        </p>
      </div>

      {/* Bookmarklet */}
      <div className="mb-6">
        <BookmarkletGenerator searchId={search.id} appUrl={appUrl} />
      </div>

      {/* Leads */}
      <LeadsTable initialLeads={leads} searchId={search.id} />
    </div>
  );
}
