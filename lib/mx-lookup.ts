import dns from 'dns/promises';

export interface MxRecord {
  exchange: string;
  priority: number;
}

export async function lookupMx(domain: string): Promise<MxRecord[]> {
  try {
    const records = await dns.resolveMx(domain);
    return records.sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

export async function hasMx(domain: string): Promise<boolean> {
  return (await lookupMx(domain)).length > 0;
}
