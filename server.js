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
  'DamageLabs/command-center',
  'fusion94/fusion94.org',
  'fusion94/clawd',
];

const TASKS_DIR = '/Users/guntharp/Documents/guntharp-personal/02 - Action/01 - Tasks';
const VAULT_DIR = '/Users/guntharp/Documents/guntharp-personal';
const DAILY_DIR = `${VAULT_DIR}/03 - Periodic/01 - Daily`;
const DECISIONS_DIR = `${VAULT_DIR}/08 - Projects/DamageLabs/Decisions`;
const STANDUP_DIR = `${process.env.HOME}/Code/brain/standups/daily`;
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
  completedTasks: null,
  notes: null,
  standup: null,
  prs: null,
  analytics: null,
  prsUpdatedAt: null,
  issuesUpdatedAt: null,
  eventsUpdatedAt: null,
  tasksUpdatedAt: null,
};

function parseTaskRecord(raw, label, color, section, completed = false) {
  const dueMatch = raw.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
  const completedAtMatch = raw.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
  const title = raw
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/#\w+/g, '')
    .replace(/🔁[^\n]*/g, '')
    .trim();
  if (!title) return null;
  return {
    title,
    source: label,
    color,
    section,
    due: dueMatch ? dueMatch[1] : null,
    recurring: raw.includes('🔁'),
    completed,
    completedAt: completedAtMatch ? completedAtMatch[1] : null,
  };
}

// ── Pull Requests ───────────────────────────────────────────────────────────────
function fetchPRs() {
  console.log('[prs] fetching open PRs...');
  try {
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
    console.log(`[prs] fetched ${allPRs.length} open PRs`);
  } catch (err) {
    console.error('[prs] fetch error:', err.message);
  }
}

// ── Standup ───────────────────────────────────────────────────────────────────
function parseStandupSections(content) {
  const yesterdayMatch = content.match(/## Yesterday\s*\n([\s\S]*?)(?=\n## [^\n]+|$)/);
  const yesterday = (yesterdayMatch ? yesterdayMatch[1] : content).trim();
  const lines = yesterday.split('\n');
  const sections = [];

  let current = null;
  let currentCategory = null;

  const finalizeCurrent = () => {
    if (!current) return;

    if (current.noActivity) {
      sections.push({
        repo: current.repo,
        stats: '',
        bullets: [current.noActivity],
      });
      current = null;
      currentCategory = null;
      return;
    }

    const nonEmptyCategories = current.categories.filter(cat => cat.items.length || cat.label);
    const stats = nonEmptyCategories
      .filter(cat => cat.items.length)
      .map(cat => `${cat.items.length} ${cat.label}`)
      .join(' · ');

    const bullets = [];
    for (const cat of nonEmptyCategories) {
      if (!cat.items.length) {
        bullets.push(cat.label);
        continue;
      }
      for (const item of cat.items) {
        bullets.push(`${cat.label}: ${item}`);
        if (bullets.length >= 4) break;
      }
      if (bullets.length >= 4) break;
    }

    sections.push({
      repo: current.repo,
      stats,
      bullets: bullets.length ? bullets : ['No parsed items'],
    });

    current = null;
    currentCategory = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (line.startsWith('### ')) {
      finalizeCurrent();
      current = { repo: line.slice(4).trim(), noActivity: null, categories: [] };
      currentCategory = null;
      continue;
    }

    if (!current) continue;

    if (/^- No (GitHub )?activity/i.test(trimmed)) {
      current.noActivity = trimmed.replace(/^-\s*/, '').replace(/\.$/, '');
      currentCategory = null;
      continue;
    }

    if (/^\s+- /.test(line) && !/^- /.test(line) && currentCategory) {
      currentCategory.items.push(
        trimmed.replace(/^-\s*/, '').replace(/\*Closes[^*]*\*/g, '').replace(/`/g, '').trim()
      );
      continue;
    }

    if (/^- /.test(line)) {
      const label = trimmed.replace(/^-\s*/, '').replace(/:$/, '').trim();
      currentCategory = { label, items: [] };
      current.categories.push(currentCategory);
      continue;
    }
  }

  finalizeCurrent();
  return sections;
}

function fetchStandup() {
  console.log('[standup] reading latest standup...');
  try {
    if (!fs.existsSync(STANDUP_DIR)) {
      cache.standup = null;
      return;
    }
    const files = fs.readdirSync(STANDUP_DIR)
      .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
      .sort().reverse();
    if (!files.length) { cache.standup = null; return; }

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
    console.log(`[standup] loaded ${date}, ${sections.length} repo sections`);
  } catch (err) {
    console.error('[standup] error:', err.message);
  }
}

// ── Notes ────────────────────────────────────────────────────────────────────
function fetchNotes() {
  console.log('[notes] reading obsidian notes...');
  try {
    const now = new Date();
    const result = { dailyNote: null, decisions: [], updatedAt: Date.now() };

    // Find today's or most recent daily note
    const months = ['01-January','02-February','03-March','04-April','05-May','06-June',
      '07-July','08-August','09-September','10-October','11-November','12-December'];
    const year = now.getFullYear();
    const month = months[now.getMonth()];
    const pad = n => String(n).padStart(2,'0');
    const todayFile = `${year}-${pad(now.getMonth()+1)}-${pad(now.getDate())}.md`;
    const monthDir = `${DAILY_DIR}/${year}/${month}`;

    // Try today, then walk back up to 7 days
    let noteContent = null, noteDate = null;
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

    if (noteContent) {
      // Strip frontmatter
      const body = noteContent.replace(/^---[\s\S]*?---\n/, '');
      // Strip Obsidian code blocks and button syntax
      const clean = body
        .replace(/```[\s\S]*?```/g, '')
        .replace(/>[^\n]*/g, '') // blockquotes
        .replace(/!\[\[[^\]]*\]\]/g, '') // embeds
        .replace(/\[\[[^\]|]*(?:\|([^\]]+))?\]\]/g, (_, alt) => alt || '')
        .replace(/#{1,6}\s/g, '')
        .trim();
      // First meaningful paragraph
      const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 20);
      result.dailyNote = {
        date: noteDate,
        preview: lines.slice(0, 3).join(' ').substring(0, 300),
        isToday: noteDate === `${year}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`,
      };
    }

    // Recent decisions
    if (fs.existsSync(DECISIONS_DIR)) {
      const files = fs.readdirSync(DECISIONS_DIR)
        .filter(f => f.endsWith('.md'))
        .sort().reverse().slice(0, 5);
      for (const file of files) {
        const content = fs.readFileSync(`${DECISIONS_DIR}/${file}`, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/i);
        const dateMatch = content.match(/\*\*Date:\*\*\s*(\S+)/i);
        const contextLines = content.split('\n')
          .filter(l => l.trim().length > 20 && !l.startsWith('#') && !l.startsWith('**'))
          .slice(0, 2).join(' ').substring(0, 200);
        result.decisions.push({
          title: titleMatch ? titleMatch[1].replace('Decision: ','') : file.replace('.md',''),
          status: statusMatch ? statusMatch[1].trim() : null,
          date: dateMatch ? dateMatch[1].trim() : file.substring(0,10),
          preview: contextLines,
          file: file.replace('.md',''),
        });
      }
    }

      cache.notes = result;
    console.log(`[notes] daily note: ${result.dailyNote?.date || 'none'}, decisions: ${result.decisions.length}`);
  } catch (err) {
    console.error('[notes] error:', err.message);
  }
}

// ── Tasks ────────────────────────────────────────────────────────────────────
function fetchTasks() {
  console.log('[tasks] reading obsidian tasks...');
  try {
    const result = [];
    const completed = [];
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
    console.log(`[tasks] found ${result.length} open tasks, ${completed.length} completed tasks`);
  } catch (err) {
    console.error('[tasks] error:', err.message);
  }
}

// ── GitHub ────────────────────────────────────────────────────────────────────
function fetchGitHub() {
  console.log('[github] fetching issues...');
  try {
    // Fetch all DamageLabs + fusion94 repos dynamically
    const damagelabsRepos = gh('repo list DamageLabs --json name,isArchived,pushedAt --limit 200')
      .map(r => ({ name: `DamageLabs/${r.name}`, archived: r.isArchived }));
    const fusion94Repos = gh('repo list fusion94 --json name,isArchived,pushedAt --limit 100')
      .filter(r => ['fusion94.org','clawd','dotfiles','homeassistant'].includes(r.name))
      .map(r => ({ name: `fusion94/${r.name}`, archived: r.isArchived }));
    const allRepos = [...damagelabsRepos, ...fusion94Repos];

    const allIssues = [];
    const repoStats = [];

    // Fetch issues only for ACTIVE_REPOS (prioritized); collect stats for all
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
    console.log(`[github] fetched ${allIssues.length} issues, ${repoStats.length} repos`);
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

// ── Umami Analytics ─────────────────────────────────────────────────────────
const UMAMI_URL = process.env.UMAMI_URL || '';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || '';
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD || '';
let umamiToken = null;
let umamiTokenExpiry = 0;

async function getUmamiToken() {
  if (umamiToken && Date.now() < umamiTokenExpiry) return umamiToken;
  try {
    const res = await fetch(`${UMAMI_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: UMAMI_USERNAME, password: UMAMI_PASSWORD }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    umamiToken = data.token;
    umamiTokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23h
    return umamiToken;
  } catch (e) {
    console.error('[umami] auth error:', e.message);
    return null;
  }
}

async function fetchAnalytics() {
  console.log('[umami] fetchAnalytics called, URL:', UMAMI_URL ? 'set' : 'MISSING');
  if (!UMAMI_URL || !UMAMI_USERNAME) { console.log('[umami] skipping - missing config'); return; }
  console.log('[umami] fetching analytics...');
  try {
    const token = await getUmamiToken();
    if (!token) return;

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
    console.log(`[umami] fetched ${siteStats.length} sites, ${totals.pageviews} total pageviews`);
  } catch (e) {
    console.error('[umami] fetch error:', e.message);
  }
}

// ── Schedules ─────────────────────────────────────────────────────────────────
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

// Infra — PM2 process list
app.get('/api/infra', (req, res) => {
  try {
    const raw = execSync('pm2 jlist', { encoding: 'utf8' });
    const processes = JSON.parse(raw);
    const data = processes.map(p => ({
      id: p.pm_id,
      name: p.name,
      status: p.pm2_env.status,
      pid: p.pid,
      uptime: p.pm2_env.status === 'online' ? Date.now() - p.pm2_env.pm_uptime : null,
      restarts: p.pm2_env.restart_time,
      cpu: p.monit?.cpu ?? 0,
      memory: p.monit?.memory ?? 0,
    }));
    res.json({ ok: true, processes: data, updatedAt: Date.now() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/tasks', (req, res) => {
  if (!cache.tasks) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, tasks: cache.tasks, completedTasks: cache.completedTasks || [], updatedAt: cache.tasksUpdatedAt });
});

app.get('/api/prs', (req, res) => {
  if (!cache.prs) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, prs: cache.prs, updatedAt: cache.prsUpdatedAt });
});

app.get('/api/standup', (req, res) => {
  res.json({ ok: true, standup: cache.standup || null });
});

app.get('/api/analytics', (req, res) => {
  if (!cache.analytics) return res.status(503).json({ ok: false, error: 'loading' });
  res.json(cache.analytics);
});

app.get('/api/notes', (req, res) => {
  if (!cache.notes) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, ...cache.notes });
});

// Quick issue close
app.post('/api/issues/:owner/:repo/:number/close', (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    execSync(`gh issue close ${number} --repo ${owner}/${repo}`, { encoding: 'utf8' });
    // Trigger background refresh
    fetchGitHub();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  fetchGitHub();
  await fetchCalendars();
  fetchTasks();
  fetchNotes();
  fetchStandup();
  fetchPRs();
  res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`command-center running at http://127.0.0.1:${PORT}`);
});
