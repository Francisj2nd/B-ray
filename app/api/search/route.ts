// Runs a Boolean X-ray search via Google Discovery Engine and stores
// the resulting LinkedIn profiles as leads (no email yet).
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { domainFromSnippet } from '@/lib/email-patterns';

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.GCP_LOCATION ?? 'global';
const ENGINE_ID = process.env.GCP_ENGINE_ID!;

interface DiscoveryResult {
  title?: string;
  link?: string;
  snippets?: { snippet?: string }[];
  htmlSnippet?: string;
}

async function runDiscoverySearch(
  query: string,
  pageToken?: string
): Promise<{ results: DiscoveryResult[]; nextPageToken: string | null }> {
  // Dynamic import keeps Google SDK out of the edge runtime
  const { SearchServiceClient, protos } = await import('@google-cloud/discoveryengine');
  const client = new SearchServiceClient();

  const servingConfig =
    `projects/${PROJECT_ID}/locations/${LOCATION}/collections/default_collection/` +
    `engines/${ENGINE_ID}/servingConfigs/default_config`;

  const [response] = await client.search({
    servingConfig,
    query,
    pageSize: 10,
    pageToken: pageToken ?? undefined,
    contentSearchSpec: {
      snippetSpec: { returnSnippet: true },
    },
  });

  const results: DiscoveryResult[] = (response.results ?? []).map(r => {
    const d = r.document?.derivedStructData?.fields ?? {};
    const snippets = d.snippets?.listValue?.values?.map((v: { structValue?: { fields?: { snippet?: { stringValue?: string } } } }) => ({
      snippet: v.structValue?.fields?.snippet?.stringValue ?? '',
    }));
    return {
      title: d.title?.stringValue ?? '',
      link: d.link?.stringValue ?? '',
      snippets,
      htmlSnippet: d.htmlSnippet?.stringValue ?? '',
    };
  });

  return {
    results,
    nextPageToken: (response as { nextPageToken?: string }).nextPageToken ?? null,
  };
}

export async function POST(req: NextRequest) {
  const { query, pageToken } = await req.json();
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  // Create or reuse a search session for this query
  const search = await prisma.search.upsert({
    where: { id: pageToken ? 'reuse' : '' },
    create: { query },
    update: {},
  }).catch(() => prisma.search.create({ data: { query } }));

  const { results, nextPageToken } = await runDiscoverySearch(query, pageToken);

  const leads = await Promise.all(
    results.map(async r => {
      const snippet = r.snippets?.[0]?.snippet ?? r.htmlSnippet ?? '';
      const domain = r.link ? null : domainFromSnippet(snippet);

      return prisma.lead.upsert({
        where: {
          email_searchId: {
            // No email yet — use linkedinUrl as a stable dedup key via a raw query below
            email: r.link ?? '',
            searchId: search.id,
          },
        },
        create: {
          name: r.title ?? null,
          linkedinUrl: r.link ?? null,
          domain,
          snippet,
          source: 'DISCOVERY_ENGINE',
          searchId: search.id,
        },
        update: {},
      }).catch(() => null);
    })
  );

  return NextResponse.json({
    searchId: search.id,
    leads: leads.filter(Boolean),
    nextPageToken,
  });
}
