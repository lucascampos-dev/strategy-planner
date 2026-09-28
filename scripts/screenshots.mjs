/**
 * Captures README screenshots from a running preview server.
 *
 *   npm run build && npm run preview          # terminal 1
 *   npx -p playwright node scripts/screenshots.mjs   # terminal 2
 *
 * Env: BASE_URL (default http://localhost:4173/strategy-planner/)
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173/strategy-planner/';
const OUT = new URL('../docs/screenshots/', import.meta.url);

const shots = [
  { name: 'dashboard', hash: '#/', viewport: { width: 1440, height: 1100 }, fullPage: true },
  {
    name: 'initiatives',
    hash: '#/initiatives',
    viewport: { width: 1440, height: 1000 },
    fullPage: true,
  },
  { name: 'timeline', hash: '#/timeline', viewport: { width: 1440, height: 1000 }, fullPage: true },
  {
    name: 'indicators',
    hash: '#/indicators?id=kpi-2',
    viewport: { width: 1440, height: 1000 },
    fullPage: true,
  },
  {
    name: 'objectives',
    hash: '#/objectives',
    viewport: { width: 1440, height: 1000 },
    fullPage: true,
  },
  {
    name: 'mobile-dashboard',
    hash: '#/',
    viewport: { width: 390, height: 844 },
    fullPage: false,
    mobile: true,
  },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    deviceScaleFactor: shot.mobile ? 2 : 1,
    isMobile: Boolean(shot.mobile),
    hasTouch: Boolean(shot.mobile),
  });
  const page = await context.newPage();
  // Start every capture from pristine demo data.
  await page.goto(BASE_URL);
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(`${BASE_URL}${shot.hash}`);
  await page.waitForSelector('.page-header');
  await page.waitForTimeout(400);
  const path = new URL(`${shot.name}.png`, OUT).pathname;
  await page.screenshot({ path, fullPage: shot.fullPage });
  console.warn(`saved ${path}`);
  await context.close();
}

await browser.close();
