'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const outDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Load the dashboard — wait for data to populate
  await page.goto('http://localhost:4500', { waitUntil: 'networkidle2', timeout: 15000 });

  // Give it a moment for the JS fetch to complete
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({
    path: path.join(outDir, 'screenshot.png'),
    fullPage: false,
  });

  await browser.close();
  console.log('Screenshot saved to docs/screenshot.png');
})();
