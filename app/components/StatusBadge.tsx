type EmailStatus = 'UNVERIFIED' | 'VALID' | 'INVALID' | 'CATCH_ALL' | 'UNKNOWN';
type LeadSource  = 'DISCOVERY_ENGINE' | 'SCRAPER' | 'ENRICHED';

const statusStyles: Record<EmailStatus, { dot: string; label: string; text: string }> = {
  VALID:      { dot: 'bg-green-500',  label: 'Verified',   text: 'text-green-700 bg-green-50 ring-green-600/20' },
  UNVERIFIED: { dot: 'bg-gray-400',   label: 'Unverified', text: 'text-gray-600  bg-gray-50  ring-gray-500/20'  },
  INVALID:    { dot: 'bg-red-500',    label: 'Invalid',    text: 'text-red-700   bg-red-50   ring-red-600/20'   },
  CATCH_ALL:  { dot: 'bg-yellow-500', label: 'Catch-all',  text: 'text-yellow-700 bg-yellow-50 ring-yellow-600/20' },
  UNKNOWN:    { dot: 'bg-gray-400',   label: 'Unknown',    text: 'text-gray-600  bg-gray-50  ring-gray-500/20'  },
};

const sourceStyles: Record<LeadSource, { label: string; text: string }> = {
  DISCOVERY_ENGINE: { label: 'X-ray',    text: 'text-blue-700   bg-blue-50   ring-blue-600/20'   },
  SCRAPER:          { label: 'SERP',     text: 'text-purple-700 bg-purple-50 ring-purple-600/20' },
  ENRICHED:         { label: 'Enriched', text: 'text-green-700  bg-green-50  ring-green-600/20'  },
};

export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const s = statusStyles[status] ?? statusStyles.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function SourceBadge({ source }: { source: LeadSource }) {
  const s = sourceStyles[source] ?? sourceStyles.SCRAPER;
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.text}`}>
      {s.label}
    </span>
  );
}
