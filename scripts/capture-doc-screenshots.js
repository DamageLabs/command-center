#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const baseUrl = process.env.COMMAND_CENTER_CAPTURE_BASE_URL || 'http://127.0.0.1:4500';
const outputDir = path.resolve(process.cwd(), 'docs', 'screenshots');
const windowSize = process.env.COMMAND_CENTER_CAPTURE_WINDOW || '1600,5000';
const routes = [
  ['home', '/'],
  ['issues-urgent', '/issues/urgent'],
  ['issues-active', '/issues/active'],
  ['issues-backlog', '/issues/backlog'],
  ['prs', '/prs'],
  ['tasks', '/tasks'],
  ['done', '/done'],
  ['notes', '/notes'],
  ['calendar', '/calendar'],
  ['repos', '/repos'],
  ['infra', '/infra'],
  ['openclaw', '/openclaw'],
  ['analytics', '/analytics'],
];

async function main() {
  await fs.promises.mkdir(outputDir, { recursive: true });

  const captured = [];
  for (const [index, [name, route]] of routes.entries()) {
    const fileName = `${String(index + 1).padStart(2, '0')}-${name}.png`;
    const filePath = path.join(outputDir, fileName);
    const target = `${baseUrl}${route}`;

    execFileSync('firefox', [
      '--headless',
      '--new-instance',
      '--screenshot',
      filePath,
      '--window-size',
      windowSize,
      target,
    ], { stdio: 'pipe' });

    captured.push({ fileName, route });
    console.log(`captured ${fileName} ← ${route}`);
  }

  const readme = [
    '# Command Center screenshots',
    '',
    `- Base URL: ${baseUrl}`,
    `- Capture window: ${windowSize}`,
    '',
    '## Captured views',
    '',
    ...captured.map((entry) => `- \`${entry.fileName}\` → \`${entry.route}\``),
    '',
  ].join('\n');

  await fs.promises.writeFile(path.join(outputDir, 'README.md'), readme);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
