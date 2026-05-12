// Runs a Boolean X-ray search via Google Discovery Engine and stores
// resulting LinkedIn profiles as leads (no email yet — enrichment comes later).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { domainFromSnippet } from '@/lib/email-patterns';

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION   = process.env.GCP_LOCATION ?? 'global';
const ENGINE_ID  = process.env.GCP_ENGINE_ID!;

interface RawResult {
  title?: string;
  link?: string;
  snippet?: string;
}

async function runDiscoverySearch(
  query: string,
  pageToken?: string
): Promise<{ results: RawResult[]; nextPageToken: string | null }> {
  const { SearchServiceClient } = await import('@google-cloud/discoveryengine');
  const client = new SearchServiceClient();

  const servingConfig =
    `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/` +
    `engines/${ENGINE_ID}/servingConfigs/default_config`;

  const [response] = await client.search({
    servingConfig,
    query,
    pageSize: 10,
    pageToken: pageToken ?? undefined,
    contentSearchSpec: { snippetSpec: { returnSnippet: true } },
  });

  const results: RawResult[] = (response.results ?? []).map(r => {
    const d = r.document?.derivedStructData?.fields ?? {};
    const snippetList = d.snippets?.listValue?.values ?? [];
    const snippet =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (snippetList[0] as any)?.structValue?.fields?.snippet?.stringValue ??
      d.htmlSnippet?.stringValue ??
      '';
    return {
      title:   d.title?.stringValue ?? '',
      link:    d.link?.stringValue ?? '',
      snippet: snippet as string,
    };
  });

  return {
    results,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nextPageToken: (response as any).nextPageToken ?? null,
  };
}

export async function POST(req: NextRequest) {
  const { query, searchId: existingId, pageToken } = await req.json();
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  // Reuse an existing search session for pagination, otherwise create a new one
  const search = existingId
    ? (await prisma.search.findUnique({ where: { id: existingId } })) ??
      (await prisma.search.create({ data: { query } }))
    : await prisma.search.create({ data: { query } });

  const { results, nextPageToken } = await runDiscoverySearch(query, pageToken);

  const leads = await Promise.all(
    results.map(async r => {
      if (!r.link) return null;

      // Skip if this LinkedIn URL is already in this search session
      const exists = await prisma.lead.findFirst({
        where: { linkedinUrl: r.link, searchId: search.id },
      });
      if (exists) return exists;

      const domain = domainFromSnippet(r.snippet ?? '');

      return prisma.lead.create({
        data: {
          name:        r.title ?? null,
          linkedinUrl: r.link,
          domain,
          snippet:     r.snippet ?? null,
          source:      'DISCOVERY_ENGINE',
          searchId:    search.id,
        },
      });
    })
  );

  return NextResponse.json({
    searchId:      search.id,
    leads:         leads.filter(Boolean),
    nextPageToken,
  });
}
