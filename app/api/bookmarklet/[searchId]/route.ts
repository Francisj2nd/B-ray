// Serves the scraper script with APP_URL and SEARCH_ID baked in.
// The bookmarklet drag-link is just:
//   javascript:(function(){var s=document.createElement('script');
//     s.src='APP_URL/api/bookmarklet/SEARCH_ID?t='+Date.now();
//     document.head.appendChild(s)})()
// Keeping the bookmarklet itself tiny means we can update the scraper without
// regenerating every user's bookmark.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const script = buildScript(appUrl, searchId);

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function buildScript(appUrl: string, searchId: string): string {
  // Inline the full scraper logic here so it works in production (no fs.readFile).
  // Values are JSON-stringified to safely handle any special characters.
  return `
(async function () {
  var APP_URL   = ${JSON.stringify(appUrl)};
  var SEARCH_ID = ${JSON.stringify(searchId)};

  var maxPages = 10;
  var allData  = [];
  var currentDoc = document;

  var emailRegex = /[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,10}/gi;
  var delay = function(ms) { return new Promise(function(r){ setTimeout(r, ms); }); };

  function getText(el) {
    return (el ? el.textContent || '' : '').replace(/[\\u200B-\\u200D\\uFEFF]/g, '').trim();
  }

  console.log('[LeadGen] Starting scraper for session: ' + SEARCH_ID);

  for (var page = 1; page <= maxPages; page++) {
    console.log('[LeadGen] Scanning page ' + page + '...');
    var pageCount = 0;

    var blocks = Array.from(currentDoc.querySelectorAll('#rso > div, div.g, div.MjjYud'));

    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var text  = getText(block);
      if (!text) continue;

      var found = text.match(emailRegex);
      if (!found) continue;

      var titleEl = block.querySelector('h3') || block.querySelector('[role="heading"]');
      var title   = titleEl ? getText(titleEl) : 'Title Not Found';

      var linkEl = block.querySelector('a[href^="http"]:not([href*="google.com"])') || block.querySelector('a');
      var url    = linkEl ? linkEl.href : 'URL Not Found';

      var unique = found.map(function(e){ return e.toLowerCase(); })
                        .filter(function(v,i,a){ return a.indexOf(v)===i; });

      for (var j = 0; j < unique.length; j++) {
        var email = unique[j];
        if (!allData.some(function(d){ return d.Email === email; })) {
          allData.push({
            BusinessName: title,
            Email: email,
            Website: url,
            Snippet: text.replace(/\\s+/g,' ').substring(0,150)+'...'
          });
          pageCount++;
        }
      }
    }

    // Deep scan fallback
    if (pageCount === 0 && currentDoc.body) {
      var bodyText  = getText(currentDoc.body);
      var bodyEmails = bodyText.match(emailRegex);
      if (bodyEmails) {
        var uBody = bodyEmails.map(function(e){ return e.toLowerCase(); })
                              .filter(function(v,i,a){ return a.indexOf(v)===i; });
        for (var k = 0; k < uBody.length; k++) {
          var be = uBody[k];
          if (!allData.some(function(d){ return d.Email === be; })) {
            allData.push({ BusinessName:'Deep Scan', Email:be, Website:'Check Google Page', Snippet:'Scraped from raw text.' });
            pageCount++;
          }
        }
      }
    }

    console.log('[LeadGen] Page ' + page + ': +' + pageCount + ' (total: ' + allData.length + ')');

    if (page === maxPages) break;

    var nextBtn = currentDoc.querySelector('a#pnnext') || currentDoc.querySelector('a[aria-label="Next page"]');
    if (!nextBtn) {
      var anchors = Array.from(currentDoc.querySelectorAll('a'));
      for (var a = 0; a < anchors.length; a++) {
        var at = anchors[a].textContent || '';
        var al = anchors[a].getAttribute('aria-label') || '';
        if (at.includes('Next') || al.includes('Next')) { nextBtn = anchors[a]; break; }
      }
    }

    if (!nextBtn || !nextBtn.href) break;

    await delay(3000);

    try {
      var resp = await fetch(nextBtn.href, { credentials: 'include' });
      if (!resp.ok) { console.warn('[LeadGen] Fetch blocked (' + resp.status + ')'); break; }
      currentDoc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    } catch(e) { console.error('[LeadGen] Fetch error', e); break; }
  }

  if (allData.length === 0) { console.error('[LeadGen] No emails found.'); return; }

  console.log('[LeadGen] Sending ' + allData.length + ' emails to platform...');
  try {
    var r = await fetch(APP_URL + '/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads: allData, searchId: SEARCH_ID })
    });
    var data = await r.json();
    console.log('[LeadGen] Done! ' + data.matched + ' matched, ' + data.saved + ' new. View: ' + APP_URL + '/searches/' + SEARCH_ID);
  } catch(e) { console.error('[LeadGen] Failed to send results', e); }
})();
`.trim();
}
