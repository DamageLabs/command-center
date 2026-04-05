'use strict';

require('dotenv').config();

const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const cron = require('node-cron');
const ical = require('node-ical');
const fs = require('fs');

const app = express();
const PORT = 4500;

// ── Config ────────────────────────────────────────────────────────────────────
const ACTIVE_REPOS = [
  'DamageLabs/uas-log',
  'DamageLabs/armory-core',
  'DamageLabs/damagelabs.io',
  'DamageLabs/paper_trail_manager',
  'DamageLabs/clahub',
  'DamageLabs/whiskey-canon',
  'DamageLabs/sports-card-tracker',
  'DamageLabs/brain',
];

const TASKS_DIR = '/Users/guntharp/Documents/guntharp-personal/02 - Action/01 - Tasks';
const TASK_FILES = [
  { file: '02 - General Tasks.md', label: 'General', color: 'amber' },
  { file: '03 - CA Tasks.md',      label: 'California', color: 'blue' },
  { file: '04 - TX Tasks.md',      label: 'Texas', color: 'green' },
];

const CALENDAR_URLS = [
  process.env.CAL_1,
  process.env.CAL_2,
].filter(Boolean);

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

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = {
  issues: null,
  repoStats: null,
  events: null,
  tasks: null,
  issuesUpdatedAt: null,
  eventsUpdatedAt: null,
  tasksUpdatedAt: null,
};

// ── Tasks ────────────────────────────────────────────────────────────────────
function fetchTasks() {
  console.log('[tasks] reading obsidian tasks...');
  try {
    const result = [];
    for (const { file, label, color } of TASK_FILES) {
      const fullPath = `${TASKS_DIR}/${file}`;
      if (!fs.existsSync(fullPath)) continue;
      const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
      let currentSection = null;
      for (const line of lines) {
        // Track headings as sections
        const headingMatch = line.match(/^#+\s+(.+)/);
        if (headingMatch) { currentSection = headingMatch[1].trim(); continue; }
        // Open tasks only: - [ ] ...
        const taskMatch = line.match(/^\s*- \[ \]\s+(.+)/);
        if (!taskMatch) continue;
        const raw = taskMatch[1];
        // Skip pure recurring without todo tag if desired (keep all open)
        const dueMatch = raw.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        const title = raw
          .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
          .replace(/#\w+/g, '')
          .replace(/🔁[^\n]*/g, '')
          .trim();
        if (!title) continue;
        result.push({
          title,
          source: label,
          color,
          section: currentSection,
          due: dueMatch ? dueMatch[1] : null,
          recurring: raw.includes('🔁'),
        });
      }
    }
    cache.tasks = result;
    cache.tasksUpdatedAt = Date.now();
    console.log(`[tasks] found ${result.length} open tasks`);
  } catch (err) {
    console.error('[tasks] error:', err.message);
  }
}

// ── GitHub ────────────────────────────────────────────────────────────────────
function fetchGitHub() {
  console.log('[github] fetching issues...');
  try {
    const allIssues = [];
    const repoStats = [];

    for (const repo of ACTIVE_REPOS) {
      try {
        const issues = gh(`issue list --repo ${repo} --state open --json number,title,labels,assignees,createdAt,url,milestone --limit 50`);
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
        });
      } catch (e) {
        console.warn(`[github] skipping ${repo}: ${e.message}`);
      }
    }

    cache.issues = allIssues;
    cache.repoStats = repoStats;
    cache.issuesUpdatedAt = Date.now();
    console.log(`[github] fetched ${allIssues.length} issues across ${repoStats.length} repos`);
  } catch (err) {
    console.error('[github] fetch error:', err.message);
  }
}

// ── Calendar ──────────────────────────────────────────────────────────────────
async function fetchCalendars() {
  console.log('[calendar] fetching events...');
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
    console.log(`[calendar] fetched ${allEvents.length} events`);
  } catch (err) {
    console.error('[calendar] fetch error:', err.message);
  }
}

// ── Schedules ─────────────────────────────────────────────────────────────────
cron.schedule('*/5 * * * *', fetchGitHub);
cron.schedule('*/10 * * * *', fetchCalendars);
cron.schedule('*/2 * * * *', fetchTasks);

fetchGitHub();
fetchCalendars();
fetchTasks();

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/issues', (req, res) => {
  if (!cache.issues) return res.status(503).json({ ok: false, error: 'loading' });
  const urgent = cache.issues.filter(i => i.priority === 'urgent');
  const active = cache.issues.filter(i => i.priority === 'active');
  const deferred = cache.issues.filter(i => i.priority === 'deferred');
  res.json({ ok: true, urgent, active, deferred, total: cache.issues.length, updatedAt: cache.issuesUpdatedAt });
});

app.get('/api/repos', (req, res) => {
  if (!cache.repoStats) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, repos: cache.repoStats, updatedAt: cache.issuesUpdatedAt });
});

app.get('/api/calendar', (req, res) => {
  if (!cache.events) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, events: cache.events, updatedAt: cache.eventsUpdatedAt });
});

app.get('/api/tasks', (req, res) => {
  if (!cache.tasks) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, tasks: cache.tasks, updatedAt: cache.tasksUpdatedAt });
});

app.post('/api/refresh', async (req, res) => {
  fetchGitHub();
  await fetchCalendars();
  fetchTasks();
  res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`command-center running at http://127.0.0.1:${PORT}`);
});
