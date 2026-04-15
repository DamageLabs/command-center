'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createApp } = require('../lib/create-app');

function sourceMetaFactory(overrides = {}) {
  return key => ({
    key,
    label: key,
    status: 'fresh',
    loading: false,
    stale: false,
    updatedAt: 1713124800000,
    ageMs: 1000,
    lastAttemptAt: 1713124800000,
    error: null,
    errorAt: null,
    staleAfterMs: 60000,
    ...(overrides[key] || {}),
  });
}

function createTestApp({ cacheOverrides = {}, sourceOverrides = {}, infraError = null } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'command-center-test-'));
  const indexFile = path.join(tempDir, 'index.html');
  fs.writeFileSync(indexFile, '<!doctype html><html><body><app-root></app-root></body></html>');

  const cache = {
    issues: [
      { title: 'Fix home render', priority: 'urgent' },
      { title: 'Polish issues view', priority: 'active' },
      { title: 'Someday feature', priority: 'deferred' },
    ],
    repoStats: [{ repo: 'command-center', repoFull: 'DamageLabs/command-center', openIssues: 3, bugs: 1, enhancements: 2 }],
    events: [{ summary: 'Standup', start: '2026-04-15T14:00:00Z' }],
    tasks: [{ title: 'Ship tests' }],
    completedTasks: [{ title: 'Merge #73', completedAt: '2026-04-14' }],
    notes: { dailyNote: { date: '2026-04-14', preview: 'Daily note preview', isToday: true }, decisions: [] },
    standup: { date: '2026-04-14', sections: [{ repo: 'DamageLabs/command-center', stats: '1 PRs', bullets: ['PRs: Ship Angular'] }] },
    prs: [{ title: 'Add smoke tests', repo: 'command-center' }],
    analytics: { totals: { pageviews: 42, visitors: 21, visits: 25, bounces: 5, totaltime: 180 }, sites: [] },
    prsUpdatedAt: 1713124800000,
    issuesUpdatedAt: 1713124800000,
    eventsUpdatedAt: 1713124800000,
    tasksUpdatedAt: 1713124800000,
    notesUpdatedAt: 1713124800000,
    standupUpdatedAt: 1713124800000,
    analyticsUpdatedAt: 1713124800000,
    ...cacheOverrides,
  };

  const refreshCalls = [];
  const app = createApp({
    cache,
    sourceMeta: sourceMetaFactory(sourceOverrides),
    sourceResponseStatus: source => (source.status === 'failed' ? 500 : 503),
    beginSource: () => {},
    succeedSource: () => {},
    failSource: () => {},
    fetchGitHub: () => refreshCalls.push('github'),
    fetchCalendars: async () => refreshCalls.push('calendar'),
    fetchTasks: () => refreshCalls.push('tasks'),
    fetchNotes: () => refreshCalls.push('notes'),
    fetchStandup: () => refreshCalls.push('standup'),
    fetchPRs: () => refreshCalls.push('prs'),
    fetchAnalytics: () => refreshCalls.push('analytics'),
    fetchOpenClawRuntime: () => ({
      version: '2026.4.12',
      gateway: { mode: 'local', url: 'ws://127.0.0.1:39217', reachable: true, misconfigured: false },
      gatewayService: { label: 'systemd', runtime: { status: 'running', state: 'active', pid: 2542 }, runtimeShort: 'running (pid 2542, state active)' },
      nodeService: { label: 'systemd', installed: false, loaded: false, managedByOpenClaw: false, externallyManaged: false, runtime: { status: 'stopped', state: 'inactive' }, runtimeShort: 'stopped (state inactive)' },
      agents: { defaultId: 'main', agents: [{ id: 'main', name: 'main', workspaceDir: '/tmp/workspace', bootstrapPending: false, sessionsPath: '/tmp/sessions.json', sessionsCount: 16 }], totalSessions: 16, bootstrapPendingCount: 0 },
      memoryPlugin: { enabled: true, slot: 'memory-core' },
      activeSessions: [{ key: 'agent:main:discord:direct:123', sessionId: 'sid-1', agent: 'main', type: 'direct', name: 'Tony DM', model: 'gpt-5.4', updatedAt: 1713124800000, ageMs: 60000, active: true, percentUsed: 12, totalTokens: 3200, contextTokens: 272000, estimatedCostUsd: 0.01, chatType: 'direct', label: 'Tony DM', subject: null, spawnedBy: null, abortedLastRun: false }],
      recentRuns: [{ key: 'agent:main:cron:test:run:sid-2', sessionId: 'sid-2', agent: 'main', type: 'run', name: 'Daily Standup', model: 'gpt-5.4', updatedAt: 1713124800000, ageMs: 120000, active: false, percentUsed: 8, totalTokens: 2800, contextTokens: 272000, estimatedCostUsd: 0.02, chatType: 'direct', label: 'Daily Standup', subject: null, spawnedBy: null, abortedLastRun: false, durationSec: 45, status: 'completed' }],
      logsTail: [{ timestamp: 1713124800000, seenAt: '2026-04-15T12:00:00Z', level: 'error', source: 'tools', message: '[tools] read failed: ENOENT' }],
      errorFeed: [{ signature: 'tools|enoent', source: 'tools', severity: 'error', count: 2, firstSeen: 1713124700000, lastSeen: 1713124800000, sampleMessage: '[tools] read failed: ENOENT', lastOccurrences: [{ timestamp: 1713124800000, source: 'tools', level: 'error', message: '[tools] read failed: ENOENT' }] }],
      logsError: null,
      updateAvailable: false,
      updateChannel: 'stable',
      updateInfo: { latestVersion: '2026.4.14' },
      secretDiagnostics: [],
      updatedAt: 1713124800000,
    }),
    closeIssue: async () => refreshCalls.push('closeIssue'),
    loadInfraProcesses: () => {
      if (infraError) throw infraError;
      return [{ id: 1, name: 'command-center', status: 'online', pid: 1234, uptime: 5000, restarts: 0, cpu: 1, memory: 2048 }];
    },
    frontend: {
      hasAngularDist: true,
      distDir: tempDir,
      indexFile,
    },
  });

  return { app, refreshCalls, cleanup: () => fs.rmSync(tempDir, { recursive: true, force: true }) };
}

async function withServer(app, fn) {
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    return await fn(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
}

test('main API routes return smoke-level shapes', async () => {
  const { app, cleanup } = createTestApp();

  try {
    await withServer(app, async baseUrl => {
      const issues = await fetch(`${baseUrl}/api/issues`).then(res => res.json());
      assert.equal(issues.ok, true);
      assert.equal(issues.urgent.length, 1);
      assert.equal(issues.active.length, 1);
      assert.equal(issues.deferred.length, 1);

      const repos = await fetch(`${baseUrl}/api/repos`).then(res => res.json());
      assert.equal(repos.ok, true);
      assert.equal(repos.repos.length, 1);

      const tasks = await fetch(`${baseUrl}/api/tasks`).then(res => res.json());
      assert.equal(tasks.ok, true);
      assert.equal(tasks.completedTasks.length, 1);

      const notes = await fetch(`${baseUrl}/api/notes`).then(res => res.json());
      assert.equal(notes.ok, true);
      assert.equal(notes.dailyNote.date, '2026-04-14');

      const standup = await fetch(`${baseUrl}/api/standup`).then(res => res.json());
      assert.equal(standup.ok, true);
      assert.equal(standup.standup.sections.length, 1);

      const analytics = await fetch(`${baseUrl}/api/analytics`).then(res => res.json());
      assert.equal(analytics.ok, true);
      assert.equal(analytics.totals.pageviews, 42);

      const openClaw = await fetch(`${baseUrl}/api/openclaw`).then(res => res.json());
      assert.equal(openClaw.ok, true);
      assert.equal(openClaw.gateway.reachable, true);
      assert.equal(openClaw.agents.totalSessions, 16);
      assert.equal(openClaw.activeSessions.length, 1);
      assert.equal(openClaw.recentRuns.length, 1);
      assert.equal(openClaw.logsTail.length, 1);
      assert.equal(openClaw.errorFeed.length, 1);
    });
  } finally {
    cleanup();
  }
});

test('infra route returns degraded-state response when process collection fails', async () => {
  const { app, cleanup } = createTestApp({
    infraError: new Error('pm2 jlist failed'),
    sourceOverrides: { infra: { status: 'failed', error: 'pm2 jlist failed' } },
  });

  try {
    await withServer(app, async baseUrl => {
      const response = await fetch(`${baseUrl}/api/infra`);
      const body = await response.json();

      assert.equal(response.status, 500);
      assert.equal(body.ok, false);
      assert.deepEqual(body.processes, []);
      assert.match(body.error, /pm2 jlist failed/);
    });
  } finally {
    cleanup();
  }
});

test('refresh route triggers all configured refreshers', async () => {
  const { app, refreshCalls, cleanup } = createTestApp();

  try {
    await withServer(app, async baseUrl => {
      const response = await fetch(`${baseUrl}/api/refresh`, { method: 'POST' });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
    });

    assert.deepEqual(refreshCalls, ['github', 'calendar', 'tasks', 'notes', 'standup', 'prs', 'analytics']);
  } finally {
    cleanup();
  }
});

test('non-API routes fall back to the Angular index file', async () => {
  const { app, cleanup } = createTestApp();

  try {
    await withServer(app, async baseUrl => {
      const response = await fetch(`${baseUrl}/issues/active`);
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.match(html, /<app-root><\/app-root>/);
    });
  } finally {
    cleanup();
  }
});
