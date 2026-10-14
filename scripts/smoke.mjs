// Smoke test: serves the built app, loads it in headless Chromium, checks for errors, clicks
// through a hotspot, a live event and a ticker, and saves screenshots to ./screenshots.
//   npm run build && npm test        (set CHROME_PATH if Chromium isn't auto-detected)
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const candidates = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
const server = await preview({ preview: { port: 4199 }, logLevel: 'silent' });
const url = process.env.APP_URL || 'http://localhost:4199/';
await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
let failed = false;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failed = true; };

async function run(name, viewport, mobile, colorScheme = 'dark') {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, colorScheme });
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::|CORS|fonts\.g/.test(m.text())) errors.push(`${name}: ${m.text()}`); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.classList.contains('ready'), null, { timeout: 30000 });
  await page.waitForFunction(() => !document.querySelector('.feed.loading'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const rows = await page.locator('#list .row').count();
  check(rows >= 20, `${name}: signal board lists ${rows} rows`);
  const labels = await page.locator('.glabel:not(.hidden)').count();
  check(labels >= 2, `${name}: ${labels} ticker labels visible on globe`);
  console.log(`      data: ${await page.locator('.feed').textContent()}`);
  await page.screenshot({ path: `screenshots/${name}-1-globe.png` });

  if (mobile) await page.click('#railOpen');
  await page.click('[data-hotspot="panama"]');
  await page.waitForTimeout(2200);
  const ptitle = await page.locator('#panel h2').textContent();
  check(ptitle.includes('Panama'), `${name}: hotspot panel opens (${ptitle})`);
  const ideas = await page.locator('#panel .idea').count();
  const threats = await page.locator('#panel .threats:not(.calm) .ev').count();
  check(ideas >= 3, `${name}: panel shows ${ideas} ticker ideas, ${threats} live threats in range`);
  await page.screenshot({ path: `screenshots/${name}-2-hotspot.png` });

  const ev = page.locator('#panel [data-event]').first();
  if (await ev.count()) {
    await ev.click();
    await page.waitForTimeout(1800);
    check(/alert/.test(await page.locator('#panel .eyebrow').textContent()), `${name}: live event panel opens`);
    await page.screenshot({ path: `screenshots/${name}-3-event.png` });
  }
  await page.locator('#panel [data-ticker]').first().click();
  await page.waitForTimeout(600);
  const refs = await page.locator('#panel .refs li').count();
  check(refs >= 1, `${name}: ticker panel lists ${refs} signals`);
  await page.screenshot({ path: `screenshots/${name}-4-ticker.png` });
  const trade = await page.locator('#panel a.trade').getAttribute('href');
  check(/^https:\/\/www\.google\.com\/finance\/quote\/[A-Z]+:(NYSE|NASDAQ|NYSEARCA|NYSEAMERICAN|BATS)$/.test(trade), `${name}: trade link ${trade}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name}: no horizontal overflow`);
  await page.close();
}

try {
  await run('desktop', { width: 1440, height: 900 }, false);
  await run('desktop-light', { width: 1440, height: 900 }, false, 'light');
  await run('mobile', { width: 390, height: 844 }, true, 'light');
} finally {
  check(errors.length === 0, `no page errors${errors.length ? ':\n  ' + errors.join('\n  ') : ''}`);
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
