'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SearchForm() {
  const router = useRouter();
  const [query, setQuery]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    const res  = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Search failed. Check your GCP credentials.');
      setLoading(false);
      return;
    }

    const { searchId } = await res.json();
    router.push(`/searches/${searchId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        rows={3}
        placeholder={'("Loan Broker" OR "Mortgage Broker") "California" "NMLS"'}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
      >
        {loading ? 'Searching…' : 'Search →'}
      </button>

      <p className="text-xs text-gray-400">
        Uses Google Discovery Engine. Supports full Boolean syntax:{' '}
        <code className="rounded bg-gray-100 px-1">OR</code>,{' '}
        <code className="rounded bg-gray-100 px-1">"exact phrase"</code>,{' '}
        <code className="rounded bg-gray-100 px-1">-exclude</code>,{' '}
        <code className="rounded bg-gray-100 px-1">site:</code>
      </p>
    </form>
  );
}
