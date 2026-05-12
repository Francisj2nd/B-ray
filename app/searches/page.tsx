import Link from 'next/link';

interface SearchRow {
  id: string;
  query: string;
  createdAt: string;
  _count: { leads: number };
  withEmail: number;
  verified: number;
}

async function getSearches(): Promise<SearchRow[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res    = await fetch(`${appUrl}/api/searches`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function SearchesPage() {
  const searches = await getSearches();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Searches</h1>
        <Link
          href="/"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Search
        </Link>
      </div>

      {searches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No searches yet.{' '}
          <Link href="/" className="text-indigo-600 underline">
            Start your first one.
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Query</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">With Email</th>
                <th className="px-4 py-3 text-right">Verified</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {searches.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/searches/${s.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {s.query.length > 80 ? s.query.slice(0, 80) + '…' : s.query}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{s._count.leads}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{s.withEmail}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{s.verified}</td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
