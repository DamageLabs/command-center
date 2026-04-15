#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const baseUrl = process.env.COMMAND_CENTER_CAPTURE_BASE_URL || 'http://127.0.0.1:4500';
const outputDir = path.resolve(process.cwd(), 'docs', 'screenshots');
const geckoPort = Number(process.env.COMMAND_CENTER_GECKO_PORT || 4444);
const theme = process.env.COMMAND_CENTER_CAPTURE_THEME || 'dark';
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
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(method, pathname, body) {
  const response = await fetch(`http://127.0.0.1:${geckoPort}${pathname}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${method} ${pathname} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function waitForServer(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${geckoPort}/status`);
      if (response.ok) return;
    } catch {
      // retry
    }
    await sleep(250);
  }
  throw new Error('geckodriver did not become ready in time');
}

async function createSession() {
  const data = await request('POST', '/session', {
    capabilities: {
      alwaysMatch: {
        browserName: 'firefox',
        'moz:firefoxOptions': {
          args: ['-headless'],
        },
      },
    },
  });

  return data.value?.sessionId || data.sessionId;
}

async function deleteSession(sessionId) {
  await request('DELETE', `/session/${sessionId}`);
}

async function setWindowRect(sessionId, width, height) {
  await request('POST', `/session/${sessionId}/window/rect`, {
    width,
    height,
  });
}

async function navigate(sessionId, url) {
  await request('POST', `/session/${sessionId}/url`, { url });
}

async function execute(sessionId, script, args = []) {
  const data = await request('POST', `/session/${sessionId}/execute/sync`, {
    script,
    args,
  });
  return data.value;
}

async function screenshot(sessionId) {
  const data = await request('GET', `/session/${sessionId}/screenshot`);
  return data.value;
}

async function waitForSettledPage(sessionId, route) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const state = await execute(sessionId, `
      const bodyText = document.body?.innerText || '';
      const loadingPanels = Array.from(document.querySelectorAll('cc-state-panel')).filter((panel) =>
        /loading/i.test(panel.textContent || '')
      ).length;
      const pending = /Loading\s+(issues|events|analytics|tasks|pull requests|repos|repositories|calendar|notes|OpenClaw|infrastructure)/i.test(bodyText);
      return {
        readyState: document.readyState,
        loadingPanels,
        pending,
        title: document.title,
        hasBody: Boolean(document.body),
        textSample: bodyText.slice(0, 300),
      };
    `);

    if (state?.readyState === 'complete' && state?.hasBody && !state?.pending && state?.loadingPanels === 0) {
      await sleep(1500);
      return;
    }

    await sleep(1000);
  }

  const finalState = await execute(sessionId, `return (document.body?.innerText || '').slice(0, 500);`);
  throw new Error(`Timed out waiting for settled page on ${route}: ${finalState}`);
}

async function captureRoute(sessionId, route, filePath) {
  await setWindowRect(sessionId, 1600, 1400);
  await navigate(sessionId, `${baseUrl}/`);
  await execute(sessionId, `window.localStorage.setItem('command-center-theme', arguments[0]);`, [theme]);
  await navigate(sessionId, `${baseUrl}${route}`);
  await waitForSettledPage(sessionId, route);

  const pageSize = await execute(sessionId, `
    return {
      width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0, 1600),
      height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0, 1200),
    };
  `);

  const height = Math.min(Math.max(pageSize.height + 120, 1200), 9000);
  await setWindowRect(sessionId, 1600, height);
  await sleep(1000);

  const imageBase64 = await screenshot(sessionId);
  await fs.promises.writeFile(filePath, Buffer.from(imageBase64, 'base64'));
}

async function main() {
  await fs.promises.mkdir(outputDir, { recursive: true });

  const geckodriver = spawn('geckodriver', ['--port', String(geckoPort)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  geckodriver.stdout.on('data', (chunk) => process.stderr.write(chunk));
  geckodriver.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer();
    const sessionId = await createSession();

    try {
      const captured = [];
      for (const [index, [name, route]] of routes.entries()) {
        const fileName = `${String(index + 1).padStart(2, '0')}-${name}.png`;
        const filePath = path.join(outputDir, fileName);
        await captureRoute(sessionId, route, filePath);
        captured.push({ fileName, route });
        console.log(`captured ${fileName} ← ${route}`);
      }

      const readme = [
        '# Command Center screenshots',
        '',
        `- Base URL: ${baseUrl}`,
        `- Theme: ${theme}`,
        '',
        '## Home',
        '',
        'Route: `/`',
        '',
        '![Home](./01-home.png)',
        '',
        '## Issues, Urgent',
        '',
        'Route: `/issues/urgent`',
        '',
        '![Issues, Urgent](./02-issues-urgent.png)',
        '',
        '## Issues, Active',
        '',
        'Route: `/issues/active`',
        '',
        '![Issues, Active](./03-issues-active.png)',
        '',
        '## Issues, Backlog',
        '',
        'Route: `/issues/backlog`',
        '',
        '![Issues, Backlog](./04-issues-backlog.png)',
        '',
        '## Pull Requests',
        '',
        'Route: `/prs`',
        '',
        '![Pull Requests](./05-prs.png)',
        '',
        '## Tasks',
        '',
        'Route: `/tasks`',
        '',
        '![Tasks](./06-tasks.png)',
        '',
        '## Done',
        '',
        'Route: `/done`',
        '',
        '![Done](./07-done.png)',
        '',
        '## Notes',
        '',
        'Route: `/notes`',
        '',
        '![Notes](./08-notes.png)',
        '',
        '## Calendar',
        '',
        'Route: `/calendar`',
        '',
        '![Calendar](./09-calendar.png)',
        '',
        '## Repositories',
        '',
        'Route: `/repos`',
        '',
        '![Repositories](./10-repos.png)',
        '',
        '## Infrastructure',
        '',
        'Route: `/infra`',
        '',
        '![Infrastructure](./11-infra.png)',
        '',
        '## OpenClaw',
        '',
        'Route: `/openclaw`',
        '',
        '![OpenClaw](./12-openclaw.png)',
        '',
      ].join('\n');

      await fs.promises.writeFile(path.join(outputDir, 'README.md'), readme);
    } finally {
      await deleteSession(sessionId);
    }
  } finally {
    geckodriver.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
