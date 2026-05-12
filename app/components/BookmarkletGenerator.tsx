'use client';

import { useState } from 'react';

interface Props {
  searchId: string;
  appUrl: string;
}

export function BookmarkletGenerator({ searchId, appUrl }: Props) {
  const [copied, setCopied] = useState(false);

  // Tiny inline script — loads the full scraper from the server at click time
  const bookmarkletHref =
    `javascript:(function(){var s=document.createElement('script');` +
    `s.src=${JSON.stringify(`${appUrl}/api/bookmarklet/${searchId}`)}+'?t='+Date.now();` +
    `document.head.appendChild(s)})()`;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(bookmarkletHref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
      <h2 className="text-sm font-semibold text-indigo-900">Step 2 — Run the SERP scraper</h2>
      <p className="mt-1 text-sm text-indigo-700">
        Drag the button below to your bookmarks bar. Then open Google, search with your
        query, and click it. Emails will be sent back here automatically.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {/* Drag target — the href is the real bookmarklet */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href={bookmarkletHref}
          draggable
          onClick={e => e.preventDefault()}
          className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:cursor-grabbing"
        >
          <span>⚡</span> LeadGen Scraper
        </a>

        <button
          onClick={copyToClipboard}
          className="text-sm text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
        >
          {copied ? '✓ Copied!' : 'Copy link instead'}
        </button>
      </div>

      <p className="mt-3 text-xs text-indigo-500">
        Can&apos;t drag? Copy the link, create a new bookmark manually, and paste it as the URL.
      </p>
    </div>
  );
}
