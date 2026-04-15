# Command Center

A personal command center dashboard. Aggregates GitHub issues and PRs, Google Calendar, Obsidian tasks and notes, daily standups, and local infrastructure status into a single tabbed UI — running locally at `https://command.test`.

## Screenshots

### Home
![Home](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-home.png)

| Urgent & Bugs | Active | PRs |
|---|---|---|
| ![Urgent](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-urgent.png) | ![Active](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-active.png) | ![PRs](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-prs.png) |

| Backlog | Infra | Notes |
|---|---|---|
| ![Backlog](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-backlog.png) | ![Infra](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-infra.png) | ![Notes](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-notes.png) |

| Tasks | Calendar | Repos |
|---|---|---|
| ![Tasks](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-tasks.png) | ![Calendar](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-calendar.png) | ![Repos](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot-repos.png) |

## Features

| Tab | Data source | Refresh |
|-----|------------|---------|
| **Home** | Aggregated summary of all sources | On load |
| **Urgent** | GitHub issues labeled `bug`, `critical`, `urgent` | 5 min |
| **Active** | GitHub issues labeled `enhancement`, `feature`, etc. | 5 min |
| **Backlog** | All other open GitHub issues | 5 min |
| **PRs** | Open pull requests across tracked repos | 5 min |
| **Notes** | Obsidian daily note + project decisions + daily standup | 5 min |
| **Infra** | PM2 process list (uptime, memory, restarts) | On demand |
| **Tasks** | Open tasks from Obsidian vault markdown files | 2 min |
| **Calendar** | Google Calendar events — next 30 days | 10 min |
| **Repos** | All GitHub repos with open issue counts | 5 min |
| **Analytics** | Umami analytics snapshot | 15 min |

**Keyboard shortcuts:** `H` Home · `U` Urgent · `A` Active · `B` Backlog · `P` PRs · `N` Notes · `I` Infra · `T` Tasks · `C` Calendar · `R` Repos · `/` Search · `Shift+R` Refresh · `?` Help

**Quick actions:** Hover any issue card to reveal a close button (×).

**Notification dots:** Red pulsing dot appears on tab badges when new issues or PRs arrive since your last visit.

**Dark/light mode:** Toggle via the moon/sun button in the header. Persists to localStorage.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** Angular + Tailwind
- **Process manager:** systemd user services for durable local runtime on Linux, PM2 optional for other workflows
- **Data sources:** `gh` CLI · Google Calendar iCal · Obsidian markdown · PM2 `jlist` · Umami

---

## Installation

### 1. Prerequisites

| Tool | Install |
|------|---------|
| Node.js 22+ | [nodejs.org](https://nodejs.org) or `nodenv install 22.x` |
| `gh` CLI | `brew install gh` then `gh auth login` |
| PM2 (optional) | `npm install -g pm2` if you want PM2-managed workflows or live PM2 infra data |

### 2. Clone and install

```bash
git clone git@github.com:DamageLabs/command-center.git
cd command-center
npm install
npm --prefix frontend install
```

### 3. Configure

Copy the example env file and config file:

```bash
cp .env.example .env
cp config.example.json config.local.json
```

Edit `.env` for calendar URLs:

```env
# Optional custom config path
# COMMAND_CENTER_CONFIG=./config.local.json

# Calendar URLs (optional)
CALENDAR_URLS=
CAL_1=https://calendar.google.com/calendar/ical/you@gmail.com/private-xxxxx/basic.ics
CAL_2=https://calendar.google.com/calendar/ical/group.calendar.google.com/private-xxxxx/basic.ics
```

Edit `config.local.json` for your machine:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 4500
  },
  "github": {
    "trackedRepos": [
      "YourOrg/repo-one",
      "YourOrg/repo-two",
      "yourusername/personal-repo"
    ],
    "orgs": [
      {
        "owner": "YourOrg",
        "repoLimit": 200
      }
    ]
  },
  "obsidian": {
    "vaultDir": "/path/to/your/obsidian/vault",
    "dailyDir": "/path/to/your/obsidian/vault/03 - Periodic/01 - Daily",
    "decisionsDir": "/path/to/your/obsidian/vault/08 - Projects/DamageLabs/Decisions",
    "tasksDir": "/path/to/your/tasks/folder",
    "taskFiles": [
      { "file": "Tasks.md", "label": "General", "color": "amber" },
      { "file": "Work Tasks.md", "label": "Work", "color": "blue" }
    ]
  },
  "standup": {
    "dir": "${HOME}/Code/brain/standups/daily"
  }
}
```

`config.local.json` is ignored by git and is the recommended place for personal paths and repo lists.

**Get your iCal URLs:** Google Calendar → Settings → [Calendar name] → _Secret address in iCal format_

#### Obsidian task format

Task files should use standard Obsidian checkbox format:

```markdown
- [ ] Task title #todo 📅 2026-04-10
- [x] Completed task ✅ 2026-04-01
```

#### Daily standups

Standup files should be named `YYYY-MM-DD.md` and use `### Repo/Name` sections.

#### Issue priority labels

Issue bucketing is still controlled in `server.js` via `issuePriority(labels)`.

### 4. Run

```bash
# Development (Angular dev server + Express API together)
npm run dev

# Or run them separately
npm run dev:api   # Express API on :4500
npm run dev:web   # Angular dev server on :4200, proxying /api to :4500

# Durable local runner on Linux via systemd --user
npm run dev:durable:start
npm run dev:durable:status
npm run dev:durable:logs -- -f

# Build the shipped Angular UI
npm run build:web

# Verify the current shipped setup
npm run check

# Serve the built Angular UI through Express
npm start

# PM2 remains optional for PM2-managed workflows
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # auto-start on reboot
```

Runs on **http://localhost:4500**.

#### Durable local runtime notes

- `npm run dev` is still fine for interactive work, but it has proven brittle on Spark for longer-lived local sessions
- `npm run dev:durable:start` installs and starts user-level systemd services for the API and web processes, reclaiming ports `4500` and `4200` from stray old dev processes if needed
- `npm run dev:durable:status` and `npm run dev:durable:logs -- -f` are the supported way to inspect or tail the durable local runner
- see `docs/local-runtime.md` for the full workflow

#### Angular runtime notes

- Angular dev server runs on **http://localhost:4200**
- `frontend/proxy.conf.json` proxies `/api/*` to the existing Express backend on **:4500**
- `npm start` now serves the built Angular frontend from `frontend/dist/frontend/browser`
- if the Angular dist is missing, Express returns a helpful message telling you to run `npm run build:web` or `npm run dev`
- the legacy single-file frontend has been archived under `archive/legacy-static-frontend/`
- the Infra view may still degrade when PM2 is not installed, because that panel currently reads PM2 state

### 5. Local HTTPS with Caddy (optional but recommended)

Install [Caddy](https://caddyserver.com) and [dnsmasq](https://thekelleys.org.uk/dnsmasq/doc.html), then:

**dnsmasq** — resolve `*.test` to localhost:
```
# /opt/homebrew/etc/dnsmasq.conf
address=/.test/127.0.0.1
```

**Caddyfile** — proxy with auto TLS:
```
command.test {
    reverse_proxy localhost:4500
    tls internal
}
```

```bash
sudo brew services start dnsmasq
sudo caddy reload --config /opt/homebrew/etc/Caddyfile
```

Then open **https://command.test** — first visit will prompt to trust the local CA.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/issues` | GET | Issues grouped as `urgent`, `active`, `deferred` |
| `/api/repos` | GET | All repos with open issue counts |
| `/api/prs` | GET | Open pull requests across tracked repos |
| `/api/calendar` | GET | Events for next 30 days |
| `/api/tasks` | GET | Open Obsidian tasks |
| `/api/notes` | GET | Daily note + recent decisions |
| `/api/analytics` | GET | Umami analytics totals + site breakdown |
| `/api/standup` | GET | Most recent daily standup |
| `/api/infra` | GET | PM2 process list |
| `/api/refresh` | POST | Force refresh all data sources |
| `/api/issues/:owner/:repo/:number/close` | POST | Close a GitHub issue |

---

## Refresh intervals

| Source | Interval |
|--------|----------|
| GitHub issues | 5 min |
| GitHub PRs | 5 min |
| Google Calendar | 10 min |
| Obsidian tasks | 2 min |
| Obsidian notes + decisions | 5 min |
| Daily standup | 10 min |
| UI auto-refresh | 30 sec |

---

## Refreshing screenshots

```bash
node scripts/screenshot.js
```

Requires the server to be running on port 4500. Screenshots saved to `docs/`.

---

## License

MIT
