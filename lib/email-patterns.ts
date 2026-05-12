export interface ParsedName {
  first: string;
  last: string;
}

export function parseName(fullName: string): ParsedName | null {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { first: parts[0].toLowerCase(), last: parts[parts.length - 1].toLowerCase() };
}

// Returns candidates in priority order — most common patterns first.
export function generateEmailCandidates(name: ParsedName, domain: string): string[] {
  const { first: f, last: l } = name;
  const fi = f[0];
  const li = l[0];

  const candidates = [
    `${f}.${l}@${domain}`,      // john.doe     — most common in professional orgs
    `${fi}${l}@${domain}`,      // jdoe
    `${f}${l}@${domain}`,       // johndoe
    `${f}@${domain}`,           // john
    `${fi}.${l}@${domain}`,     // j.doe
    `${f}${li}@${domain}`,      // johnd
    `${f}_${l}@${domain}`,      // john_doe
    `${l}.${f}@${domain}`,      // doe.john
    `${l}${fi}@${domain}`,      // doej
    `${l}@${domain}`,           // doe
  ];

  // Dedupe while preserving order
  return [...new Map(candidates.map(c => [c, c])).values()];
}

// Pull a bare domain out of a URL (linkedin.com/in/john → null, acme.com → acme.com)
export function domainFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    // Skip social/aggregator domains that don't host company email
    const blocked = ['linkedin.com', 'google.com', 'facebook.com', 'twitter.com', 'github.com'];
    return blocked.some(b => host.endsWith(b)) ? null : host;
  } catch {
    return null;
  }
}

// Try to extract a domain from a LinkedIn snippet or company name by looking
// for a website pattern, e.g. "Visit us at acmemortgage.com"
export function domainFromSnippet(snippet: string): string | null {
  const match = snippet.match(/\b([a-z0-9-]+\.[a-z]{2,10})\b/i);
  if (!match) return null;
  const candidate = match[1].toLowerCase();
  const blocked = ['linkedin.com', 'google.com', 'yelp.com', 'facebook.com'];
  return blocked.includes(candidate) ? null : candidate;
}
