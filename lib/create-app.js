'use strict';

const express = require('express');

function createApp(options) {
  const {
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
    closeIssue,
    loadInfraProcesses,
    frontend,
  } = options;

  const app = express();

  if (frontend?.hasAngularDist) {
    app.use(express.static(frontend.distDir));
  }

  app.get('/api/issues', (req, res) => {
    const source = sourceMeta('github');
    if (!cache.issues) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    const urgent = cache.issues.filter(issue => issue.priority === 'urgent');
    const active = cache.issues.filter(issue => issue.priority === 'active');
    const deferred = cache.issues.filter(issue => issue.priority === 'deferred');
    return res.json({ ok: true, urgent, active, deferred, total: cache.issues.length, updatedAt: cache.issuesUpdatedAt, source });
  });

  app.get('/api/repos', (req, res) => {
    const source = sourceMeta('github');
    if (!cache.repoStats) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    return res.json({ ok: true, repos: cache.repoStats, updatedAt: cache.issuesUpdatedAt, source });
  });

  app.get('/api/calendar', (req, res) => {
    const source = sourceMeta('calendar');
    if (!cache.events) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    return res.json({ ok: true, events: cache.events, updatedAt: cache.eventsUpdatedAt, source });
  });

  app.get('/api/infra', (req, res) => {
    beginSource('infra');
    try {
      const updatedAt = Date.now();
      const processes = loadInfraProcesses();
      succeedSource('infra', updatedAt);
      return res.json({ ok: true, processes, updatedAt, source: sourceMeta('infra') });
    } catch (error) {
      failSource('infra', error);
      const source = sourceMeta('infra');
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: error.message, processes: [], updatedAt: source.updatedAt, source });
    }
  });

  app.get('/api/tasks', (req, res) => {
    const source = sourceMeta('tasks');
    if (!cache.tasks) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    return res.json({ ok: true, tasks: cache.tasks, completedTasks: cache.completedTasks || [], updatedAt: cache.tasksUpdatedAt, source });
  });

  app.get('/api/prs', (req, res) => {
    const source = sourceMeta('prs');
    if (!cache.prs) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    return res.json({ ok: true, prs: cache.prs, updatedAt: cache.prsUpdatedAt, source });
  });

  app.get('/api/standup', (req, res) => {
    const source = sourceMeta('standup');
    return res.json({ ok: true, standup: cache.standup || null, updatedAt: cache.standupUpdatedAt, source });
  });

  app.get('/api/analytics', (req, res) => {
    const source = sourceMeta('analytics');
    if (!cache.analytics) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    return res.json({ ok: true, ...cache.analytics, source });
  });

  app.get('/api/notes', (req, res) => {
    const source = sourceMeta('notes');
    if (!cache.notes) {
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: source.error || source.status, source });
    }
    return res.json({ ok: true, ...cache.notes, source });
  });

  app.get('/api/openclaw', (req, res) => {
    try {
      const runtime = fetchOpenClawRuntime();
      return res.json({ ok: true, ...runtime, source: sourceMeta('openclaw') });
    } catch (error) {
      const source = sourceMeta('openclaw');
      return res.status(sourceResponseStatus(source)).json({ ok: false, error: error.message, source });
    }
  });

  app.post('/api/issues/:owner/:repo/:number/close', async (req, res) => {
    try {
      const { owner, repo, number } = req.params;
      await closeIssue({ owner, repo, number });
      fetchGitHub();
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/refresh', async (req, res) => {
    fetchGitHub();
    await fetchCalendars();
    fetchTasks();
    fetchNotes();
    fetchStandup();
    fetchPRs();
    fetchAnalytics();
    return res.json({ ok: true });
  });

  app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
    if (!frontend?.hasAngularDist) {
      return res.status(503).send('Angular build output not found. Run "npm run build:web" or start the dev server with "npm run dev".');
    }

    return res.sendFile(frontend.indexFile);
  });

  return app;
}

module.exports = { createApp };
