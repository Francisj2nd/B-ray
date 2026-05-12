// Matches emails scraped from Google SERPs back to leads found via Discovery Engine.
// No fuzzy-match library — just normalised string containment, which is fast and
// accurate enough given that name + domain together are highly selective.

export interface ScrapedEmail {
  BusinessName: string;
  Email: string;
  Website: string;
  Snippet: string;
}

export interface DiscoveryLead {
  id: string;
  name: string | null;
  company: string | null;
  domain: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Best-effort: extract a first/last name from the local part of an email address.
// Handles john.doe, johndoe, j.doe, jdoe patterns.
function namePartsFromLocal(local: string): { first: string; last: string } | null {
  const dotSplit = local.split('.');
  if (dotSplit.length === 2 && dotSplit[0].length > 1 && dotSplit[1].length > 1) {
    return { first: dotSplit[0], last: dotSplit[1] };
  }
  // Try splitting a run like "johndoe" — hard without a dictionary, skip
  return null;
}

export function matchEmailToLead(
  scraped: ScrapedEmail,
  leads: DiscoveryLead[]
): DiscoveryLead | null {
  const [local, emailDomain] = scraped.Email.split('@');
  if (!emailDomain) return null;

  const normEmailDomain = normalize(emailDomain);
  const nameFromEmail = namePartsFromLocal(local);

  for (const lead of leads) {
    // 1. Domain match — strongest signal
    if (lead.domain && normalize(lead.domain) === normEmailDomain) return lead;

    // 2. Name match via email local part + lead name
    if (nameFromEmail && lead.name) {
      const leadNorm = normalize(lead.name);
      if (
        leadNorm.includes(normalize(nameFromEmail.first)) &&
        leadNorm.includes(normalize(nameFromEmail.last))
      ) {
        return lead;
      }
    }

    // 3. Company name appears in the scraped BusinessName
    if (lead.company) {
      const compNorm = normalize(lead.company);
      if (compNorm.length >= 4 && normalize(scraped.BusinessName).includes(compNorm)) {
        return lead;
      }
    }
  }

  return null;
}
