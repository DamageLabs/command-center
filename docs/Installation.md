# Installation

This guide covers getting `command-center` running locally for development or daily use on a machine you control.

For architecture, see [System-Design.md](./System-Design.md).
For configuration details, see [Configuration.md](./Configuration.md).
For the Linux durable local runner, see [local-runtime.md](./local-runtime.md).

---

## 1. What you are installing

`command-center` is a local dashboard with:
- a Node/Express API on port `4500`
- an Angular frontend on port `4200` during development
- optional local integrations for GitHub, calendar feeds, Obsidian content, standups, PM2, and analytics

There are two main ways to run it:
- **split dev mode**: Angular dev server + Express API
- **built local mode**: Express serves the built Angular app

On Linux, there is also a **durable local dev workflow** using user-level `systemd` services.

---

## 2. Prerequisites

### Required
- **Node.js 22+**
- **npm**
- **Git**

### Required for GitHub-backed views
- **GitHub CLI (`gh`)**
- authenticated `gh` session via `gh auth login`

### Optional
- **PM2** if you want live PM2 data in the Infra view
- **systemd --user** if you want the durable Linux runner
- **Caddy** / local HTTPS tooling if you want a custom local hostname such as `https://command.test`

---

## 3. Clone and install dependencies

```bash
git clone git@github.com:DamageLabs/command-center.git
cd command-center
npm install
npm --prefix frontend install
```

---

## 4. Create local config files

Copy the local env and config templates:

```bash
cp .env.example .env
cp config.example.json config.local.json
```

`config.local.json` is the recommended place for machine-specific paths, repo lists, and other local-only settings.

---

## 5. Configure the app

At minimum, edit:
- `.env`
- `config.local.json`

### Typical minimum setup
- configure GitHub repos and orgs in `config.local.json`
- configure Obsidian paths if you want notes, tasks, and decisions
- configure the standup directory if you use the standup panel
- add iCal URLs in `.env` if you want calendar data

See [Configuration.md](./Configuration.md) for the full config surface.

---

## 6. Run in development

### Single command
```bash
npm run dev
```

This starts:
- API on `:4500`
- Angular dev server on `:4200`

### Split mode
```bash
npm run dev:api
npm run dev:web
```

In split mode:
- the Angular dev server runs on `http://localhost:4200`
- `/api/*` is proxied to the backend on `http://localhost:4500`

---

## 7. Run the durable local Linux workflow

If you want the local dashboard to stay up persistently on a Linux workstation:

```bash
npm run dev:durable:start
npm run dev:durable:status
npm run dev:durable:logs -- -f
```

Other useful commands:

```bash
npm run dev:durable:restart
npm run dev:durable:stop
npm run dev:durable:uninstall
```

This installs user services for:
- `command-center-api.service`
- `command-center-web.service`

For more detail, see [local-runtime.md](./local-runtime.md).

---

## 8. Run the built local mode

Build the Angular app:

```bash
npm run build:web
```

Then start the backend:

```bash
npm start
```

In this mode, Express serves both:
- the API
- the built frontend from `frontend/dist/frontend/browser`

---

## 9. Verification

### Quick checks

Frontend dev server:
```bash
curl -I http://127.0.0.1:4200/
```

API:
```bash
curl -I http://127.0.0.1:4500/
```

OpenClaw route:
```bash
curl http://127.0.0.1:4500/api/openclaw
```

Build + syntax check:
```bash
npm run check
```

Server tests:
```bash
npm test
```

---

## 10. Optional local HTTPS

If you want a nicer local URL such as `https://command.test`, you can front the app with local HTTPS tooling such as Caddy.

Typical shape:
- resolve a local hostname to your workstation
- reverse proxy that hostname to the app
- trust the local development certificate authority

This is optional and not required for normal local use.

---

## 11. Common setup notes

### GitHub data looks empty
Make sure:
- `gh` is installed
- `gh auth status` succeeds
- your `github.trackedRepos` and `github.orgs` config is populated

### Tasks, notes, or decisions are empty
Make sure the Obsidian paths in `config.local.json` point to real directories on disk.

### Calendar is empty
Make sure you added valid iCal URLs in `.env` using `CALENDAR_URLS` or `CAL_1` / `CAL_2`.

### Infra is degraded
That often means PM2 is not installed or not available in the current environment. The rest of the app can still work.

### Durable runner is unavailable
The durable runner requires Linux with `systemd --user` available.

---

## 12. Recommended local workflow

For day-to-day development:
- use `npm run dev` for short interactive sessions
- use `npm run dev:durable:start` on Linux when you want the dashboard to stay up continuously
- keep personal paths and secrets in `config.local.json` and `.env`
