'use strict';

require('dotenv').config();

const { execFileSync, execSync } = require('child_process');
const path = require('path');
const cron = require('node-cron');
const ical = require('node-ical');
const fs = require('fs');
const { createApp } = require('./lib/create-app');
const { loadConfig } = require('./lib/config');
const {
  parseTaskRecord,
  parseStandupSections,
  extractDailyNotePreview,
  extractDecisionSummary,
} = require('./lib/parsers');
const { config: runtimeConfig, configPath, warnings: configWarnings } = loadConfig();
const PORT = runtimeConfig.server.port;
const HOST = runtimeConfig.server.host;

// ── Config ────────────────────────────────────────────────────────────────────
const ACTIVE_REPOS = runtimeConfig.github.trackedRepos;
const GITHUB_ORGS = runtimeConfig.github.orgs;

const DAILY_DIR = runtimeConfig.obsidian.dailyDir;
const DECISIONS_DIR = runtimeConfig.obsidian.decisionsDir;
const TASKS_DIR = runtimeConfig.obsidian.tasksDir;
const TASK_FILES = runtimeConfig.obsidian.taskFiles;
const STANDUP_DIR = runtimeConfig.standup.dir;

const CALENDAR_URLS = runtimeConfig.calendar.icalUrls;

const ANGULAR_DIST_DIR = path.join(__dirname, 'frontend', 'dist', 'frontend', 'browser');
const ANGULAR_INDEX_FILE = path.join(ANGULAR_DIST_DIR, 'index.html');
const HAS_ANGULAR_DIST = fs.existsSync(ANGULAR_INDEX_FILE);

console.log(`[config] loaded ${path.relative(__dirname, configPath) || configPath}`);
for (const warning of configWarnings) {
  console.warn(`[config] ${warning}`);
}
if (!HAS_ANGULAR_DIST) {
  console.warn('[frontend] Angular build output not found. Run "npm run build:web" for the shipped UI or use "npm run dev" for local development.');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function issuePriority(labels) {
  const names = labels.map(l => l.name.toLowerCase());
  if (names.some(n => n.includes('bug') || n.includes('critical') || n.includes('urgent'))) return 'urgent';
  if (names.some(n => n.includes('enhancement') || n.includes('feature') || n.includes('frontend') || n.includes('backend'))) return 'active';
  return 'deferred';
}

function gh(cmd) {
  return JSON.parse(execSync(`gh ${cmd}`, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
}

function configuredRepos() {
  const deduped = new Map();

  for (const org of GITHUB_ORGS) {
    try {
      let repos = gh(`repo list ${org.owner} --json name,isArchived,pushedAt --limit ${org.repoLimit}`);
      if (org.includeRepos.length) {
        repos = repos.filter(repo => org.includeRepos.includes(repo.name));
      }
      if (org.excludeRepos.length) {
        repos = repos.filter(repo => !org.excludeRepos.includes(repo.name));
      }

      for (const repo of repos) {
        deduped.set(`${org.owner}/${repo.name}`, {
          name: `${org.owner}/${repo.name}`,
          archived: repo.isArchived,
        });
      }
    } catch (error) {
      console.warn(`[github] skipping org ${org.owner}: ${error.message}`);
    }
  }

  return [...deduped.values()];
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = {
  issues: null,
  repoStats: null,
  events: null,
  tasks: null,
  completedTasks: null,
  notes: null,
  standup: null,
  prs: null,
  analytics: null,
  prsUpdatedAt: null,
  issuesUpdatedAt: null,
  eventsUpdatedAt: null,
  tasksUpdatedAt: null,
  notesUpdatedAt: null,
  standupUpdatedAt: null,
  analyticsUpdatedAt: null,
};

const SOURCE_CONFIG = {
  github: { label: 'GitHub', staleAfterMs: 15 * 60 * 1000 },
  calendar: { label: 'Calendar', staleAfterMs: 30 * 60 * 1000 },
  tasks: { label: 'Tasks', staleAfterMs: 10 * 60 * 1000 },
  notes: { label: 'Notes', staleAfterMs: 30 * 60 * 1000 },
  standup: { label: 'Standup', staleAfterMs: 36 * 60 * 60 * 1000 },
  prs: { label: 'PRs', staleAfterMs: 15 * 60 * 1000 },
  analytics: { label: 'Analytics', staleAfterMs: 30 * 60 * 1000 },
  infra: { label: 'Infra', staleAfterMs: 5 * 60 * 1000 },
  openclaw: { label: 'OpenClaw', staleAfterMs: 2 * 60 * 1000 },
};

let sourceState = Object.fromEntries(
  Object.keys(SOURCE_CONFIG).map(key => [key, {
    loading: true,
    lastAttemptAt: null,
    lastSuccessAt: null,
    error: null,
    errorAt: null,
  }])
);

function beginSource(key) {
  if (!sourceState[key]) return;
  sourceState[key].loading = true;
  sourceState[key].lastAttemptAt = Date.now();
}

function succeedSource(key, updatedAt = Date.now()) {
  if (!sourceState[key]) return;
  sourceState[key].loading = false;
  sourceState[key].lastSuccessAt = updatedAt;
  sourceState[key].error = null;
  sourceState[key].errorAt = null;
}

function failSource(key, error) {
  if (!sourceState[key]) return;
  sourceState[key].loading = false;
  sourceState[key].error = error?.message || String(error);
  sourceState[key].errorAt = Date.now();
}

function sourceMeta(key, overrides = {}) {
  const cfg = SOURCE_CONFIG[key] || { label: key, staleAfterMs: 15 * 60 * 1000 };
  const state = sourceState[key] || {};
  const now = Date.now();
  const updatedAt = state.lastSuccessAt || null;
  const ageMs = updatedAt ? now - updatedAt : null;

  let status = 'fresh';
  if (state.loading && !updatedAt) status = 'loading';
  else if (!updatedAt && state.error) status = 'failed';
  else if (updatedAt && state.error) status = 'stale';
  else if (updatedAt && ageMs !== null && ageMs > cfg.staleAfterMs) status = 'stale';
  else if (state.loading) status = 'refreshing';

  return {
    key,
    label: cfg.label,
    status,
    loading: status === 'loading' || status === 'refreshing',
    stale: status === 'stale',
    updatedAt,
    ageMs,
    lastAttemptAt: state.lastAttemptAt || null,
    error: state.error || null,
    errorAt: state.errorAt || null,
    staleAfterMs: cfg.staleAfterMs,
    ...overrides,
  };
}

function sourceResponseStatus(source) {
  return source.status === 'failed' ? 500 : 503;
}

// ── Pull Requests ───────────────────────────────────────────────────────────────
function fetchPRs() {
  console.log('[prs] fetching open PRs...');
  beginSource('prs');
  try {
    if (!ACTIVE_REPOS.length) {
      cache.prs = [];
      cache.prsUpdatedAt = Date.now();
      succeedSource('prs', cache.prsUpdatedAt);
      console.log('[prs] skipped, no github.trackedRepos configured');
      return;
    }

    const allPRs = [];
    for (const repo of ACTIVE_REPOS) {
      try {
        const prs = gh(`pr list --repo ${repo} --state open --json number,title,author,createdAt,url,headRefName,isDraft,reviewDecision,labels --limit 20`);
        const repoName = repo.split('/')[1];
        allPRs.push(...prs.map(pr => ({
          ...pr,
          repo: repoName,
          repoFull: repo,
        })));
      } catch (e) {
        // repo may have no PRs or no access
      }
    }
    allPRs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    cache.prs = allPRs;
    cache.prsUpdatedAt = Date.now();
    succeedSource('prs', cache.prsUpdatedAt);
    console.log(`[prs] fetched ${allPRs.length} open PRs`);
  } catch (err) {
    failSource('prs', err);
    console.error('[prs] fetch error:', err.message);
  }
}

// ── Standup ───────────────────────────────────────────────────────────────────
function fetchStandup() {
  console.log('[standup] reading latest standup...');
  beginSource('standup');
  try {
    if (!STANDUP_DIR || !fs.existsSync(STANDUP_DIR)) {
      cache.standup = null;
      cache.standupUpdatedAt = Date.now();
      succeedSource('standup', cache.standupUpdatedAt);
      return;
    }
    const files = fs.readdirSync(STANDUP_DIR)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort().reverse();
    if (!files.length) {
      cache.standup = null;
      cache.standupUpdatedAt = Date.now();
      succeedSource('standup', cache.standupUpdatedAt);
      return;
    }

    const latest = files[0];
    const date = latest.replace('.md', '');
    const content = fs.readFileSync(`${STANDUP_DIR}/${latest}`, 'utf8');
    const sections = parseStandupSections(content);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    cache.standup = {
      date,
      isToday: date === todayStr,
      title: content.match(/^# (.+)/m)?.[1] || `Standup ${date}`,
      sections,
      raw: content,
    };
    cache.standupUpdatedAt = Date.now();
    succeedSource('standup', cache.standupUpdatedAt);
    console.log(`[standup] loaded ${date}, ${sections.length} repo sections`);
  } catch (err) {
    failSource('standup', err);
    console.error('[standup] error:', err.message);
  }
}

// ── Notes ────────────────────────────────────────────────────────────────────
function fetchNotes() {
  console.log('[notes] reading obsidian notes...');
  beginSource('notes');
  try {
    const now = new Date();
    const result = { dailyNote: null, decisions: [], updatedAt: Date.now() };

    if (!DAILY_DIR && !DECISIONS_DIR) {
      cache.notes = result;
      cache.notesUpdatedAt = result.updatedAt;
      succeedSource('notes', cache.notesUpdatedAt);
      console.log('[notes] skipped, no obsidian daily/decisions paths configured');
      return;
    }

    // Find today's or most recent daily note
    const months = ['01-January','02-February','03-March','04-April','05-May','06-June',
      '07-July','08-August','09-September','10-October','11-November','12-December'];
    const pad = n => String(n).padStart(2,'0');
    // Try today, then walk back up to 7 days
    let noteContent = null, noteDate = null;
    if (DAILY_DIR) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now - i * 86400000);
        const m = months[d.getMonth()];
        const fname = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}.md`;
        const fpath = `${DAILY_DIR}/${d.getFullYear()}/${m}/${fname}`;
        if (fs.existsSync(fpath)) {
          noteContent = fs.readFileSync(fpath, 'utf8');
          noteDate = fname.replace('.md','');
          break;
        }
      }
    }

    if (noteContent) {
      result.dailyNote = extractDailyNotePreview(noteContent, noteDate, now);
    }

    // Recent decisions
    if (DECISIONS_DIR && fs.existsSync(DECISIONS_DIR)) {
      const files = fs.readdirSync(DECISIONS_DIR)
        .filter(f => f.endsWith('.md'))
        .sort().reverse().slice(0, 5);
      for (const file of files) {
        const content = fs.readFileSync(`${DECISIONS_DIR}/${file}`, 'utf8');
        result.decisions.push(extractDecisionSummary(content, file));
      }
    }

    cache.notes = result;
    cache.notesUpdatedAt = result.updatedAt;
    succeedSource('notes', cache.notesUpdatedAt);
    console.log(`[notes] daily note: ${result.dailyNote?.date || 'none'}, decisions: ${result.decisions.length}`);
  } catch (err) {
    failSource('notes', err);
    console.error('[notes] error:', err.message);
  }
}

// ── Tasks ────────────────────────────────────────────────────────────────────
function fetchTasks() {
  console.log('[tasks] reading obsidian tasks...');
  beginSource('tasks');
  try {
    const result = [];
    const completed = [];

    if (!TASKS_DIR || !TASK_FILES.length) {
      cache.tasks = result;
      cache.completedTasks = completed;
      cache.tasksUpdatedAt = Date.now();
      succeedSource('tasks', cache.tasksUpdatedAt);
      console.log('[tasks] skipped, no tasks config found');
      return;
    }

    for (const { file, label, color } of TASK_FILES) {
      const fullPath = `${TASKS_DIR}/${file}`;
      if (!fs.existsSync(fullPath)) continue;
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
      let currentSection = null;
      for (const line of lines) {
        // Track headings as sections
        const headingMatch = line.match(/^#+\s+(.+)/);
        if (headingMatch) { currentSection = headingMatch[1].trim(); continue; }
        const openTaskMatch = line.match(/^\s*- \[ \]\s+(.+)/);
        if (openTaskMatch) {
          const task = parseTaskRecord(openTaskMatch[1], label, color, currentSection, false);
          if (task) result.push(task);
          continue;
        }
        const completedTaskMatch = line.match(/^\s*- \[[xX]\]\s+(.+)/);
        if (completedTaskMatch) {
          const task = parseTaskRecord(completedTaskMatch[1], label, color, currentSection, true);
          if (task) completed.push(task);
        }
      }
    }
    cache.tasks = result;
    cache.completedTasks = completed.sort((a, b) => {
      if (a.completedAt && b.completedAt) return b.completedAt.localeCompare(a.completedAt);
      if (a.completedAt) return -1;
      if (b.completedAt) return 1;
      return 0;
    });
    cache.tasksUpdatedAt = Date.now();
    succeedSource('tasks', cache.tasksUpdatedAt);
    console.log(`[tasks] found ${result.length} open tasks, ${completed.length} completed tasks`);
  } catch (err) {
    failSource('tasks', err);
    console.error('[tasks] error:', err.message);
  }
}

// ── GitHub ────────────────────────────────────────────────────────────────────
function fetchGitHub() {
  console.log('[github] fetching issues...');
  beginSource('github');
  try {
    if (!GITHUB_ORGS.length) {
      cache.issues = [];
      cache.repoStats = [];
      cache.issuesUpdatedAt = Date.now();
      succeedSource('github', cache.issuesUpdatedAt);
      console.log('[github] skipped, no github.orgs configured');
      return;
    }

    const allRepos = configuredRepos();

    const allIssues = [];
    const repoStats = [];
    for (const { name: repo, archived } of allRepos) {
      try {
        const issues = gh(`issue list --repo ${repo} --state open --json number,title,labels,assignees,createdAt,url,milestone --limit 100`);
        const repoName = repo.split('/')[1];

        allIssues.push(...issues.map(i => ({
          ...i,
          repo: repoName,
          repoFull: repo,
          priority: issuePriority(i.labels),
        })));

        repoStats.push({
          repo: repoName,
          repoFull: repo,
          openIssues: issues.length,
          bugs: issues.filter(i => i.labels.some(l => l.name === 'bug')).length,
          enhancements: issues.filter(i => i.labels.some(l => l.name === 'enhancement')).length,
          lastActivity: issues.length > 0 ? issues[0].createdAt : null,
          tracked: true,
          archived,
        });
      } catch (e) {
        console.warn(`[github] skipping ${repo}: ${e.message}`);
      }
    }

    cache.issues = allIssues;
    cache.repoStats = repoStats;
    cache.issuesUpdatedAt = Date.now();
    succeedSource('github', cache.issuesUpdatedAt);
    console.log(`[github] fetched ${allIssues.length} issues, ${repoStats.length} repos`);
  } catch (err) {
    failSource('github', err);
    console.error('[github] fetch error:', err.message);
  }
}

// ── Calendar ──────────────────────────────────────────────────────────────────
async function fetchCalendars() {
  console.log('[calendar] fetching events...');
  beginSource('calendar');
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1hr back (catch in-progress)

    const allEvents = [];

    for (const url of CALENDAR_URLS) {
      try {
        const data = await ical.async.fromURL(url);
        for (const [, event] of Object.entries(data)) {
          if (event.type !== 'VEVENT') continue;

          // Handle recurring events
          const start = event.start instanceof Date ? event.start : new Date(event.start);
          const end = event.end instanceof Date ? event.end : new Date(event.end || start);

          if (start < windowStart || start > windowEnd) continue;

          allEvents.push({
            id: event.uid,
            title: event.summary || '(No title)',
            start: start.toISOString(),
            end: end.toISOString(),
            allDay: !event.start?.dateTime && !event.start?.getHours,
            location: event.location || null,
            description: event.description ? event.description.substring(0, 200) : null,
            calendar: url.includes('group.calendar') ? 'Work' : 'Personal',
          });
        }
      } catch (e) {
        console.warn(`[calendar] error fetching ${url.substring(0, 50)}...: ${e.message}`);
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    cache.events = allEvents;
    cache.eventsUpdatedAt = Date.now();
    succeedSource('calendar', cache.eventsUpdatedAt);
    console.log(`[calendar] fetched ${allEvents.length} events`);
  } catch (err) {
    failSource('calendar', err);
    console.error('[calendar] fetch error:', err.message);
  }
}

// ── Umami Analytics ─────────────────────────────────────────────────────────
const UMAMI_URL = process.env.UMAMI_URL || '';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || '';
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD || '';
let umamiToken = null;
let umamiTokenExpiry = 0;

async function getUmamiToken() {
  if (umamiToken && Date.now() < umamiTokenExpiry) return umamiToken;
  const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok || !data.token) {
    throw new Error(data.error || data.message || `Umami auth failed (${res.status})`);
  }
  umamiToken = data.token;
  umamiTokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
  return umamiToken;
}

async function fetchAnalytics() {
  console.log('[umami] fetchAnalytics called, URL:', UMAMI_URL ? 'set' : 'MISSING');
  beginSource('analytics');
  if (!UMAMI_URL || !UMAMI_USERNAME) {
    const err = new Error('Umami is not configured');
    failSource('analytics', err);
    console.log('[umami] skipping - missing config');
    return;
  }
  console.log('[umami] fetching analytics...');
  try {
    const token = await getUmamiToken();

    const endAt = Date.now();
    const startAt = endAt - 30 * 24 * 60 * 60 * 1000; // 30 days

    // Get all websites
    const sitesRes = await fetch(`${UMAMI_URL}/api/websites?pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    const sitesData = await sitesRes.json();
    const sites = sitesData.data || sitesData || [];

    // Fetch stats for each site in parallel
    const siteStats = await Promise.all(
      sites.map(async (site) => {
        try {
          const statsRes = await fetch(
            `${UMAMI_URL}/api/websites/${site.id}/stats?startAt=${startAt}&endAt=${endAt}`,
            { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
          );
          const stats = await statsRes.json();
          return {
            id: site.id,
            name: site.name,
            domain: site.domain,
            pageviews: stats.pageviews || 0,
            visitors: stats.visitors || 0,
            visits: stats.visits || 0,
            bounces: stats.bounces || 0,
            totaltime: stats.totaltime || 0,
          };
        } catch {
          return { id: site.id, name: site.name, domain: site.domain, pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 };
        }
      })
    );

    // Sort by pageviews desc
    siteStats.sort((a, b) => b.pageviews - a.pageviews);

    // Aggregate totals
    const totals = siteStats.reduce(
      (acc, s) => ({
        pageviews: acc.pageviews + s.pageviews,
        visitors: acc.visitors + s.visitors,
        visits: acc.visits + s.visits,
        bounces: acc.bounces + s.bounces,
        totaltime: acc.totaltime + s.totaltime,
      }),
      { pageviews: 0, visitors: 0, visits: 0, bounces: 0, totaltime: 0 }
    );

    cache.analytics = {
      totals,
      sites: siteStats,
      updatedAt: new Date().toISOString(),
      range: '30d',
    };
    cache.analyticsUpdatedAt = Date.now();
    succeedSource('analytics', cache.analyticsUpdatedAt);
    console.log(`[umami] fetched ${siteStats.length} sites, ${totals.pageviews} total pageviews`);
  } catch (e) {
    failSource('analytics', e);
    console.error('[umami] fetch error:', e.message);
  }
}

function loadInfraProcesses() {
  const raw = execSync('pm2 jlist', { encoding: 'utf8' });
  const processes = JSON.parse(raw);
  return processes.map(process => ({
    id: process.pm_id,
    name: process.name,
    status: process.pm2_env.status,
    pid: process.pid,
    uptime: process.pm2_env.status === 'online' ? Date.now() - process.pm2_env.pm_uptime : null,
    restarts: process.pm2_env.restart_time,
    cpu: process.monit?.cpu ?? 0,
    memory: process.monit?.memory ?? 0,
  }));
}

function fetchOpenClawRuntime() {
  beginSource('openclaw');
  try {
    const raw = execFileSync('openclaw', ['status', '--json'], {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 2 * 1024 * 1024,
    });
    const status = JSON.parse(raw);
    const updatedAt = Date.now();
    succeedSource('openclaw', updatedAt);
    return {
      version: status.gateway?.self?.version || null,
      gateway: status.gateway || null,
      gatewayService: status.gatewayService || null,
      nodeService: status.nodeService || null,
      agents: status.agents || null,
      memoryPlugin: status.memoryPlugin || null,
      updateAvailable: status.updateAvailable || null,
      updateChannel: status.updateChannel || null,
      updateInfo: status.doctor?.registry || null,
      secretDiagnostics: status.secretDiagnostics || [],
      updatedAt,
    };
  } catch (error) {
    failSource('openclaw', error);
    throw error;
  }
}

const app = createApp({
  cache,
  sourceMeta,
  sourceResponseStatus,
  beginSource,
  succeedSource,
  failSource,
  fetchGitHub,
  fetchCalendars,
  fetchTasks,
  fetchNotes,
  fetchStandup,
  fetchPRs,
  fetchAnalytics,
  fetchOpenClawRuntime,
  closeIssue: ({ owner, repo, number }) => execSync(`gh issue close ${number} --repo ${owner}/${repo}`, { encoding: 'utf8' }),
  loadInfraProcesses,
  frontend: {
    hasAngularDist: HAS_ANGULAR_DIST,
    distDir: ANGULAR_DIST_DIR,
    indexFile: ANGULAR_INDEX_FILE,
  },
});

// ── Schedules ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  cron.schedule('*/5 * * * *', fetchGitHub);
  cron.schedule('*/10 * * * *', fetchCalendars);
  cron.schedule('*/2 * * * *', fetchTasks);
  cron.schedule('*/5 * * * *', fetchNotes);
  cron.schedule('*/10 * * * *', fetchStandup);
  cron.schedule('*/5 * * * *', fetchPRs);
  cron.schedule('*/15 * * * *', fetchAnalytics);

  fetchGitHub();
  fetchCalendars();
  fetchTasks();
  fetchNotes();
  fetchStandup();
  fetchPRs();
  fetchAnalytics();

  app.listen(PORT, HOST, () => {
    console.log(`command-center running at http://${HOST}:${PORT}`);
  });
}

module.exports = {
  app,
  cache,
  sourceMeta,
  sourceResponseStatus,
  loadInfraProcesses,
  fetchOpenClawRuntime,
};
