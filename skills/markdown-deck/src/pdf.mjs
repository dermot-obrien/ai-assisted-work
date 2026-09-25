// SPDX-License-Identifier: Apache-2.0
/**
 * Deck HTML to PDF.
 *
 * Playwright is an optional peer dependency, loaded dynamically, so `npm install` of this
 * skill stays light and the build path works without a browser. PDF is the only feature
 * that needs one.
 *
 * On Windows, prefer an already-installed browser over downloading Chromium: Edge ships
 * with Windows 11, so `--channel msedge` avoids a ~150MB download and the corporate proxy
 * problem that comes with it. MARKDOWN_DECK_CHANNEL or MARKDOWN_DECK_BROWSER override.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHANNEL_FALLBACKS = ['msedge', 'chrome', 'chromium'];
const SHRINK_WARN = 0.6;

export async function exportPdf(deckHtmlPath, outPdf, { onLog = console.log } = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error(
      'PDF export needs playwright. Install it in this skill:\n' +
      '  npm install playwright\n' +
      'On Windows no browser download is needed; Edge is used via --channel msedge.');
  }

  const explicit = process.env.MARKDOWN_DECK_CHANNEL;
  const exePath = process.env.MARKDOWN_DECK_BROWSER;
  const attempts = exePath ? [{ executablePath: exePath }]
    : explicit ? [{ channel: explicit }]
      : CHANNEL_FALLBACKS.map((c) => (c === 'chromium' ? {} : { channel: c }));

  let browser;
  let fits = [];
  const failures = [];
  for (const opts of attempts) {
    try {
      browser = await chromium.launch(opts);
      onLog(`  browser: ${opts.channel || opts.executablePath || 'bundled chromium'}`);
      break;
    } catch (e) {
      failures.push(`${opts.channel || opts.executablePath || 'chromium'}: ${e.message.split('\n')[0]}`);
    }
  }
  if (!browser) {
    throw new Error(`no usable browser.\n  ${failures.join('\n  ')}\n` +
      '  Install one, or run: npx playwright install chromium');
  }

  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(pathToFileURL(path.resolve(deckHtmlPath)).href, { waitUntil: 'networkidle' });
    // Fitting depends on final text metrics, so wait for fonts and images first.
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((img) => (img.complete ? null
        : new Promise((r) => { img.addEventListener('load', r); img.addEventListener('error', r); }))));
    });
    // The print stylesheet shows every slide and drops the chrome. Fit again under it,
    // so every page is fitted in the layout that is actually printed.
    await page.emulateMedia({ media: 'print' });
    fits = await page.evaluate(() => {
      if (!window.__deck) return [];
      window.__deck.fitAll();
      return window.__deck.fits();
    });
    fs.mkdirSync(path.dirname(path.resolve(outPdf)), { recursive: true });
    await page.pdf({
      path: path.resolve(outPdf),
      width: '1920px',
      height: '1080px',
      printBackground: true,
      pageRanges: '',
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } finally {
    await browser.close();
  }

  const stat = fs.statSync(path.resolve(outPdf));
  if (stat.size === 0) throw new Error(`PDF written but empty: ${outPdf}`);
  // A slide shrunk this far is legible on screen and hard to read on a projector.
  const cramped = fits.filter((f) => f.fit < SHRINK_WARN);
  for (const f of cramped) {
    onLog(`  ! slide ${f.slide} "${f.title}" shrunk to ${Math.round(f.fit * 100)}% to fit; ` +
      'consider splitting it or moving detail into deck:skip');
  }
  return { path: path.resolve(outPdf), bytes: stat.size, fits };
}
