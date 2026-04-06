# Command Center

A personal command center dashboard. Aggregates GitHub issues and PRs, Google Calendar, Obsidian tasks and notes, daily standups, and PM2 infrastructure status into a single tabbed UI — running locally at `https://command.test`.

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

**Keyboard shortcuts:** `H` Home · `U` Urgent · `A` Active · `B` Backlog · `P` PRs · `N` Notes · `I` Infra · `T` Tasks · `C` Calendar · `R` Repos · `/` Search · `Shift+R` Refresh · `?` Help

**Quick actions:** Hover any issue card to reveal a close button (×).

**Notification dots:** Red pulsing dot appears on tab badges when new issues or PRs arrive since your last visit.

**Dark/light mode:** Toggle via the moon/sun button in the header. Persists to localStorage.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS — no framework, no build step
- **Process manager:** PM2
- **Data sources:** `gh` CLI · Google Calendar iCal · Obsidian markdown · PM2 `jlist`

---

## Installation

### 1. Prerequisites

| Tool | Install |
|------|---------|
| Node.js 22+ | [nodejs.org](https://nodejs.org) or `nodenv install 22.x` |
| `gh` CLI | `brew install gh` then `gh auth login` |
| PM2 | `npm install -g pm2` |

### 2. Clone and install

```bash
git clone git@github.com:DamageLabs/command-center.git
cd command-center
npm install
```

### 3. Configure

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Google Calendar iCal URLs (optional — leave empty to skip)
CAL_1=https://calendar.google.com/calendar/ical/you@gmail.com/private-xxxxx/basic.ics
CAL_2=https://calendar.google.com/calendar/ical/group.calendar.google.com/private-xxxxx/basic.ics
```

**Get your iCal URLs:** Google Calendar → Settings → [Calendar name] → _Secret address in iCal format_

### 4. Edit `server.js` for your setup

Open `server.js` and update these constants near the top:

#### GitHub repos to track (issues + PRs)

```js
const ACTIVE_REPOS = [
  'YourOrg/repo-one',
  'YourOrg/repo-two',
  'yourusername/personal-repo',
];
```

These repos get full issue detail in Urgent/Active/Backlog. All repos from your org(s) appear in the Repos tab.

To change which orgs are listed in Repos, update the fetch calls in `fetchGitHub()`:

```js
const allRepos = gh('repo list YourOrg --json name,isArchived,pushedAt --limit 200')
  .map(r => ({ name: `YourOrg/${r.name}`, archived: r.isArchived }));
```

#### Obsidian vault (optional)

```js
const VAULT_DIR = '/path/to/your/obsidian/vault';
const DAILY_DIR = `${VAULT_DIR}/your-daily-notes-folder`;
const DECISIONS_DIR = `${VAULT_DIR}/your-decisions-folder`;
```

#### Obsidian tasks (optional)

```js
const TASKS_DIR = '/path/to/your/tasks/folder';
const TASK_FILES = [
  { file: 'Tasks.md', label: 'General', color: 'amber' },
  { file: 'Work Tasks.md', label: 'Work', color: 'blue' },
];
```

Task files should use standard Obsidian checkbox format:

```markdown
- [ ] Task title #todo 📅 2026-04-10
- [x] Completed task ✅ 2026-04-01
```

#### Daily standups (optional)

```js
const STANDUP_DIR = '/path/to/your/standups/daily';
```

Expects files named `YYYY-MM-DD.md` with `### Repo/Name` sections.

#### Issue priority labels

```js
// Customize which labels map to which priority bucket
function issuePriority(labels) {
  const names = labels.map(l => l.name.toLowerCase());
  if (names.some(n => n.includes('bug') || n.includes('urgent'))) return 'urgent';
  if (names.some(n => n.includes('enhancement') || n.includes('feature'))) return 'active';
  return 'deferred';
}
```

### 5. Run

```bash
# Development (direct)
npm start

# Production (PM2)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # auto-start on reboot
```

Runs on **http://localhost:4500**.

### 6. Local HTTPS with Caddy (optional but recommended)

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
