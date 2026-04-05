'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TABS = [
  { id: 'urgent',   label: 'urgent' },
  { id: 'active',   label: 'active' },
  { id: 'backlog',  label: 'backlog' },
  { id: 'infra',    label: 'infra' },
  { id: 'tasks',    label: 'tasks' },
  { id: 'calendar', label: 'calendar' },
  { id: 'repos',    label: 'repos' },
];

(async () => {
  const outDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Initial load — wait for data
  await page.goto('http://localhost:4500', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Full dashboard screenshot (default Urgent tab)
  await page.screenshot({ path: path.join(outDir, 'screenshot.png') });
  console.log('✓ screenshot.png');

  // Each tab
  for (const tab of TABS) {
    await page.evaluate((id) => {
      if (typeof switchView === 'function') switchView(id);
    }, tab.id);
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outDir, `screenshot-${tab.label}.png`) });
    console.log(`✓ screenshot-${tab.label}.png`);
  }

  await browser.close();
  console.log('\nAll screenshots saved to docs/');
})();
