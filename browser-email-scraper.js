(async function () {
    const maxPages = 10;
    let allData = [];
    let currentDoc = document;

    // Cap TLD at 10 chars to avoid matching garbage strings
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}/gi;
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // textContent works on both live DOM and DOMParser documents.
    // innerText requires a layout engine and silently returns "" on parsed documents.
    const getText = el =>
        (el ? el.textContent || '' : '').replace(/[​-‍﻿]/g, '').trim();

    // --- AUTO-NAMING LOGIC ---
    const searchBox =
        document.querySelector('textarea[name="q"]') ||
        document.querySelector('input[name="q"]');
    const rawQuery = searchBox ? searchBox.value : document.title;

    let trade = 'Contractor';
    let city = 'Leads';

    const tradeMatch = rawQuery.match(/^\("([^"]+)"/);
    if (tradeMatch) trade = tradeMatch[1];

    const cityMatch = rawQuery.match(/\)\s*"([^"]+)"/);
    if (cityMatch) city = cityMatch[1];

    const fileName = `${trade} - ${city}`.replace(/[/\\?%*:|"<>]/g, '-');
    // -------------------------

    console.log(`🚀 Starting extraction. File will be: "${fileName}.csv"`);

    for (let page = 1; page <= maxPages; page++) {
        console.log(`📄 Scanning page ${page}...`);
        let pageEmailsFound = 0;

        // querySelectorAll already returns unique elements — no Set needed
        const blocks = Array.from(
            currentDoc.querySelectorAll('#rso > div, div.g, div.MjjYud')
        );

        for (const block of blocks) {
            const textContent = getText(block);
            if (!textContent) continue;

            const emailsFound = textContent.match(emailRegex);
            if (!emailsFound) continue;

            const titleEl =
                block.querySelector('h3') || block.querySelector('[role="heading"]');
            const title = titleEl ? getText(titleEl) : 'Title Not Found';

            const linkEl =
                block.querySelector('a[href^="http"]:not([href*="google.com"])') ||
                block.querySelector('a');
            const url = linkEl ? linkEl.href : 'URL Not Found';

            const uniqueEmails = [...new Set(emailsFound.map(e => e.toLowerCase()))];
            for (const email of uniqueEmails) {
                if (!allData.some(item => item.Email === email)) {
                    allData.push({
                        BusinessName: title,
                        Email: email,
                        Website: url,
                        // \s+ normalises all whitespace variants (newlines, tabs, etc.)
                        Snippet: textContent.replace(/\s+/g, ' ').substring(0, 150) + '...'
                    });
                    pageEmailsFound++;
                }
            }
        }

        // Deep scan fallback when structured blocks yield nothing
        if (pageEmailsFound === 0 && currentDoc.body) {
            const bodyText = getText(currentDoc.body);
            const allEmails = bodyText.match(emailRegex);
            if (allEmails) {
                for (const email of [...new Set(allEmails.map(e => e.toLowerCase()))]) {
                    if (!allData.some(item => item.Email === email)) {
                        allData.push({
                            BusinessName: 'Deep Scan',
                            Email: email,
                            Website: 'Check Google Page',
                            Snippet: 'Scraped from raw text. Context unavailable.'
                        });
                        pageEmailsFound++;
                    }
                }
            }
        }

        console.log(`✅ Page ${page}: +${pageEmailsFound} new emails (total: ${allData.length})`);

        if (page === maxPages) {
            console.log('🛑 Reached max pages limit.');
            break;
        }

        let nextBtn =
            currentDoc.querySelector('a#pnnext') ||
            currentDoc.querySelector('a[aria-label="Next page"]');
        if (!nextBtn) {
            nextBtn = Array.from(currentDoc.querySelectorAll('a')).find(
                a =>
                    a.textContent?.includes('Next') ||
                    a.getAttribute('aria-label')?.includes('Next')
            );
        }

        if (!nextBtn?.href) {
            console.log('🛑 No "Next" button found — end of results.');
            break;
        }

        console.log('⏳ Waiting 3 seconds before next page...');
        await delay(3000);

        try {
            // credentials: 'include' sends the active Google session cookies,
            // which reduces the chance of a bot-detection block
            const response = await fetch(nextBtn.href, { credentials: 'include' });
            if (!response.ok) {
                console.warn(`❌ Fetch blocked by Google (status ${response.status}). Saving what we have.`);
                break;
            }
            currentDoc = new DOMParser().parseFromString(
                await response.text(),
                'text/html'
            );
        } catch (err) {
            console.error('❌ Error fetching next page:', err);
            break;
        }
    }

    if (allData.length === 0) {
        console.error('❌ No emails found across any pages.');
        return;
    }

    console.log(`💾 Building CSV with ${allData.length} unique emails...`);

    const escape = s => `"${s.replace(/"/g, '""')}"`;
    const csvContent = [
        'Business Name,Email,Website,Context Snippet',
        ...allData.map(r =>
            [escape(r.BusinessName), escape(r.Email), escape(r.Website), escape(r.Snippet)].join(',')
        )
    ].join('\n');

    const link = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })),
        download: `${fileName}.csv`
    });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`🎉 Done! Downloaded: ${fileName}.csv`);
})();
