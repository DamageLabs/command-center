'use strict';

const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const cron = require('node-cron');

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

// Label → priority mapping
function issuePriority(labels) {
  const names = labels.map(l => l.name.toLowerCase());
  if (names.some(n => n.includes('bug') || n.includes('critical') || n.includes('urgent'))) return 'urgent';
  if (names.some(n => n.includes('enhancement') || n.includes('feature') || n.includes('frontend') || n.includes('backend'))) return 'active';
  return 'deferred';
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let cache = {
  issues: null,
  repoStats: null,
  updatedAt: null,
};

function gh(cmd) {
  return JSON.parse(execSync(`gh ${cmd}`, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }));
}

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
    cache.updatedAt = Date.now();
    console.log(`[github] fetched ${allIssues.length} issues across ${repoStats.length} repos`);
  } catch (err) {
    console.error('[github] fetch error:', err.message);
  }
}

// Refresh every 5 minutes
cron.schedule('*/5 * * * *', fetchGitHub);
fetchGitHub(); // initial load

// ── Routes ────────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// All issues, grouped by priority
app.get('/api/issues', (req, res) => {
  if (!cache.issues) return res.status(503).json({ ok: false, error: 'loading' });

  const urgent = cache.issues.filter(i => i.priority === 'urgent');
  const active = cache.issues.filter(i => i.priority === 'active');
  const deferred = cache.issues.filter(i => i.priority === 'deferred');

  res.json({
    ok: true,
    urgent,
    active,
    deferred,
    total: cache.issues.length,
    updatedAt: cache.updatedAt,
  });
});

// Repo stats
app.get('/api/repos', (req, res) => {
  if (!cache.repoStats) return res.status(503).json({ ok: false, error: 'loading' });
  res.json({ ok: true, repos: cache.repoStats, updatedAt: cache.updatedAt });
});

// Force refresh
app.post('/api/refresh', (req, res) => {
  fetchGitHub();
  res.json({ ok: true, message: 'refresh triggered' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`command-center running at http://127.0.0.1:${PORT}`);
});
