# Command Center

A personal command center dashboard for DamageLabs. Aggregates GitHub issues, Google Calendar, Obsidian tasks, and PM2 infrastructure status into a single tabbed UI.

![Command Center dashboard](https://raw.githubusercontent.com/DamageLabs/command-center/main/docs/screenshot.png)

## Features

- **Urgent / Active / Backlog** — GitHub open issues across all DamageLabs repos, bucketed by label priority
- **Infra** — Live PM2 process status with uptime, memory, restart count, and `.test` domain links
- **Tasks** — Open tasks parsed directly from an Obsidian vault (General, CA, TX)
- **Calendar** — Google Calendar events for the next 30 days via iCal
- **Repos** — Repository stats with bug/feature/last-activity breakdown
- Auto-refresh every 30 seconds, live clock
- DamageLabs navy/amber dark theme

## Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Process manager:** PM2
- **Data sources:** `gh` CLI, iCal feeds, Obsidian markdown files, PM2 `jlist`

## Setup

### Prerequisites

- Node.js 22+
- [`gh` CLI](https://cli.github.com) authenticated (`gh auth login`)
- PM2 (`npm install -g pm2`)

### Install

```bash
git clone git@github.com:DamageLabs/command-center.git
cd command-center
npm install
```

### Configure

Create a `.env` file in the project root (this is gitignored):

```
CAL_1=https://calendar.google.com/calendar/ical/<your-personal-ical-url>/basic.ics
CAL_2=https://calendar.google.com/calendar/ical/<your-work-ical-url>/basic.ics
```

Get your iCal URLs from **Google Calendar → Settings → [Calendar name] → Secret address in iCal format**.

If you don't use Google Calendar, remove the `CALENDAR_URLS` entries from `server.js` or leave `.env` empty — the Calendar tab will show an empty state.

### Obsidian Tasks (optional)

By default the server reads task files from:

```
~/Documents/guntharp-personal/02 - Action/01 - Tasks/
```

Update `TASKS_DIR` and `TASK_FILES` in `server.js` to match your vault path and file names.

### GitHub Repos

Edit `ACTIVE_REPOS` in `server.js` to match the repos you want to track:

```js
const ACTIVE_REPOS = [
  'YourOrg/repo-one',
  'YourOrg/repo-two',
];
```

### Run

```bash
# Direct
npm start

# Via PM2
pm2 start ecosystem.config.cjs
pm2 save
```

Runs on `http://localhost:4500`.

### With Caddy + dnsmasq (local HTTPS)

Add to your Caddyfile:

```
command.test {
    reverse_proxy localhost:4500
    tls internal
}
```

Then `sudo caddy reload --config /path/to/Caddyfile`.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/issues` | Issues grouped as `urgent`, `active`, `deferred` |
| `GET /api/repos` | Repo stats (open issues, bugs, enhancements) |
| `GET /api/calendar` | Events for next 30 days |
| `GET /api/tasks` | Open Obsidian tasks |
| `GET /api/infra` | PM2 process list |
| `POST /api/refresh` | Force refresh all data sources |

## Priority Logic

Issues are bucketed by label:

| Priority | Labels matched |
|----------|---------------|
| Urgent | `bug`, `critical`, `urgent` |
| Active | `enhancement`, `feature`, `frontend`, `backend` |
| Backlog | Everything else |

## License

MIT
