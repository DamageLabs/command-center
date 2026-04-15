# Contributing to Command Center

Thanks for contributing.

This project is a local-first dashboard for GitHub work, calendar events, notes, tasks, standups, analytics, infrastructure status, and OpenClaw runtime visibility.

## Development setup

```bash
git clone git@github.com:DamageLabs/command-center.git
cd command-center
npm install
npm --prefix frontend install
cp .env.example .env
cp config.example.json config.local.json
```

Update `.env` and `config.local.json` for your machine before running the app.

## Running locally

```bash
# API + Angular dev server
npm run dev

# or run them separately
npm run dev:api
npm run dev:web

# durable local Linux runner
npm run dev:durable:start
npm run dev:durable:status
npm run dev:durable:logs -- -f
```

Default local ports:
- `4200` Angular dev server
- `4500` Express API / built app

## Before you commit

Run the standard checks:

```bash
npm test
```

That covers:
- server tests
- Angular production build
- `node --check server.js`

## Config and local-only files

Keep machine-specific paths, repo lists, and secrets out of git.

Use:
- `.env`
- `config.local.json`

Do not commit personal calendar URLs, vault paths, tokens, or machine-local overrides.

## Screenshots for docs

To refresh the docs screenshots against the live local app:

```bash
node scripts/capture-doc-screenshots.js
```

Requirements:
- the app should be running on `http://127.0.0.1:4500`
- the capture flow currently uses Firefox + geckodriver in headless mode

Screenshots are written to:
- `docs/screenshots/`

## UI and product notes

A few current expectations:
- prefer polished, finished-product UI over migration/demo language
- keep shared semantic colors readable in both light and dark themes
- for OpenClaw features, prefer real runtime data over invented placeholders
- if a page depends on live data, verify against the running local app, not just static code review

## Pull requests

Keep PRs small and focused when possible.

A good PR should include:
- a clear title
- a short summary of what changed
- test/verification notes
- screenshots when the UI changed materially

## Direct pushes vs PRs

The maintainer may sometimes choose direct commits to `main` for docs or small operational fixes.

When in doubt:
- use a branch + PR for feature work
- use direct commits only when explicitly requested

## Style

- keep changes scoped
- avoid unrelated cleanup in the same change
- prefer readable, boring code over cleverness
- update docs when workflows or operator behavior change
