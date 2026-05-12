'use client';

import { useState } from 'react';
import { EmailStatusBadge, SourceBadge } from './StatusBadge';

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

interface Props {
  initialLeads: Lead[];
  searchId: string;
}

export function LeadsTable({ initialLeads, searchId }: Props) {
  const [leads, setLeads]           = useState(initialLeads);
  const [enriching, setEnriching]   = useState(false);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enrichStats, setEnrichStats] = useState<{ enriched: number; failed: number } | null>(null);

  async function enrichAll() {
    setEnriching(true);
    setEnrichStats(null);
    const res  = await fetch('/api/enrich/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchId }),
    });
    const data = await res.json();
    setEnrichStats({ enriched: data.enriched, failed: data.failed });
    // Refresh leads
    const updated = await fetch(`/api/searches/${searchId}`).then(r => r.json());
    setLeads(updated.leads);
    setEnriching(false);
  }

  async function enrichOne(lead: Lead) {
    if (!lead.name || !lead.domain) return;
    setEnrichingId(lead.id);
    const res  = await fetch('/api/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, name: lead.name, domain: lead.domain }),
    });
    const data = await res.json();
    if (data.email) {
      setLeads(prev =>
        prev.map(l => l.id === lead.id ? { ...l, email: data.email, source: 'ENRICHED', emailStatus: data.reason === 'valid' ? 'VALID' : 'UNKNOWN' } : l)
      );
    }
    setEnrichingId(null);
  }

  async function verifyOne(lead: Lead) {
    if (!lead.email) return;
    setEnrichingId(lead.id);
    const res  = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lead.email, leadId: lead.id }),
    });
    const data = await res.json();
    setLeads(prev =>
      prev.map(l => l.id === lead.id ? { ...l, emailStatus: data.reason === 'valid' ? 'VALID' : data.reason === 'invalid' ? 'INVALID' : data.reason === 'catch_all' ? 'CATCH_ALL' : 'UNKNOWN' } : l)
    );
    setEnrichingId(null);
  }

  function exportCsv() {
    const rows = [
      ['Name', 'Email', 'LinkedIn', 'Domain', 'Status', 'Source'],
      ...leads.map(l => [
        l.name ?? '',
        l.email ?? '',
        l.linkedinUrl ?? '',
        l.domain ?? '',
        l.emailStatus,
        l.source,
      ]),
    ];
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `leads-${searchId}.csv`,
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const withEmail   = leads.filter(l => l.email).length;
  const verified    = leads.filter(l => l.emailStatus === 'VALID').length;
  const needsWork   = leads.filter(l => !l.email && (l.domain || l.linkedinUrl)).length;

  return (
    <div>
      {/* Stats bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-6 text-sm text-gray-600">
          <span><span className="font-semibold text-gray-900">{leads.length}</span> leads</span>
          <span><span className="font-semibold text-gray-900">{withEmail}</span> with email</span>
          <span><span className="font-semibold text-green-600">{verified}</span> verified</span>
        </div>

        <div className="flex gap-2">
          {needsWork > 0 && (
            <button
              onClick={enrichAll}
              disabled={enriching}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
            >
              {enriching ? 'Enriching…' : `Enrich ${needsWork} leads`}
            </button>
          )}
          <button
            onClick={exportCsv}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {enrichStats && (
        <p className="mb-3 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
          Enrichment complete — {enrichStats.enriched} found, {enrichStats.failed} not found.
        </p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">LinkedIn</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No leads yet. Run the bookmarklet on Google, or wait for results.
                </td>
              </tr>
            )}
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                  {lead.name ?? <span className="text-gray-400 italic">Unknown</span>}
                  {lead.domain && (
                    <span className="ml-1.5 text-xs text-gray-400">{lead.domain}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {lead.email ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <EmailStatusBadge status={lead.emailStatus} />
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={lead.source} />
                </td>
                <td className="px-4 py-3">
                  {lead.linkedinUrl ? (
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Profile ↗
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {enrichingId === lead.id ? (
                    <span className="text-xs text-gray-400">Working…</span>
                  ) : lead.email && lead.emailStatus === 'UNVERIFIED' ? (
                    <button
                      onClick={() => verifyOne(lead)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Verify
                    </button>
                  ) : !lead.email && (lead.domain || lead.linkedinUrl) ? (
                    <button
                      onClick={() => enrichOne(lead)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Find email
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
