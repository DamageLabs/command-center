# Configuration

This guide explains how `command-center` discovers config, which settings are required vs optional, and how local paths and environment variables are resolved.

For installation steps, see [Installation.md](./Installation.md).
For architecture, see [System-Design.md](./System-Design.md).

---

## 1. Config sources

`command-center` uses a mix of:
- JSON config files
- environment variables

### JSON config resolution order
The loader checks, in order:
1. `COMMAND_CENTER_CONFIG` if set
2. `config.local.json`
3. `config.json`
4. `config.example.json`

If none of the earlier files exist, the app falls back to `config.example.json` and emits warnings.

### Recommended local setup
Use:
- `config.local.json` for machine-specific settings
- `.env` for environment variables and sensitive values

---

## 2. Path expansion and normalization

The config loader in `lib/config.js` normalizes several values for you.

### Supported path expansion
- `~` expands to your home directory
- `${HOME}` expands to your home directory

### Normalization behavior
The loader also:
- deep-merges config with defaults
- de-duplicates string lists such as repo lists and iCal URLs
- derives some Obsidian paths from `obsidian.vaultDir` if they are omitted

If `obsidian.vaultDir` is set but these are omitted, the loader derives:
- `obsidian.dailyDir` → `03 - Periodic/01 - Daily`
- `obsidian.decisionsDir` → `08 - Projects/DamageLabs/Decisions`

---

## 3. Example config

A typical `config.local.json` looks like this:

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
      },
      {
        "owner": "yourusername",
        "repoLimit": 100,
        "includeRepos": [
          "personal-repo"
        ]
      }
    ]
  },
  "obsidian": {
    "vaultDir": "/path/to/your/obsidian/vault",
    "dailyDir": "/path/to/your/obsidian/vault/03 - Periodic/01 - Daily",
    "decisionsDir": "/path/to/your/obsidian/vault/08 - Projects/DamageLabs/Decisions",
    "tasksDir": "/path/to/your/tasks/folder",
    "taskFiles": [
      {
        "file": "Tasks.md",
        "label": "General",
        "color": "amber"
      },
      {
        "file": "Work Tasks.md",
        "label": "Work",
        "color": "blue"
      }
    ]
  },
  "standup": {
    "dir": "${HOME}/Code/brain/standups/daily"
  }
}
```

---

## 4. Server settings

```json
"server": {
  "host": "127.0.0.1",
  "port": 4500
}
```

### `server.host`
- default: `127.0.0.1`
- controls where the Express backend binds

Use a non-localhost host only if you intentionally want LAN exposure. This app is designed for trusted local use and does not include a built-in auth layer for dashboard access.

### `server.port`
- default: `4500`
- controls the API port and the built-mode app port

---

## 5. GitHub settings

```json
"github": {
  "trackedRepos": [...],
  "orgs": [...]
}
```

### `github.trackedRepos`
Used for:
- PR listing
- targeted repo-level views

Format:
- `owner/repo`

### `github.orgs`
Used for repo discovery and issue scanning.

Each entry supports:
- `owner` (required)
- `repoLimit` (optional, default `200`)
- `includeRepos` (optional)
- `excludeRepos` (optional)

### If GitHub config is missing
The app will still run, but GitHub-backed views will warn or remain empty.

Also make sure:
```bash
gh auth status
```
works on the machine running the app.

---

## 6. Obsidian settings

```json
"obsidian": {
  "vaultDir": "...",
  "dailyDir": "...",
  "decisionsDir": "...",
  "tasksDir": "...",
  "taskFiles": [...]
}
```

### `vaultDir`
Optional, but useful as a base path for derived defaults.

### `dailyDir`
Directory containing daily notes used by the Notes/Home surfaces.

### `decisionsDir`
Directory containing decision notes.

### `tasksDir`
Directory containing task markdown files.

### `taskFiles`
List of task files to parse.

Each entry supports:
- `file` (required)
- `label` (optional, defaults to the file name)
- `color` (optional, defaults to `amber`)

Example:

```json
"taskFiles": [
  {
    "file": "Tasks.md",
    "label": "General",
    "color": "amber"
  },
  {
    "file": "Work Tasks.md",
    "label": "Work",
    "color": "blue"
  }
]
```

### Task markdown expectations
The parser expects standard markdown task lines, for example:

```md
- [ ] Ship dashboard polish #todo 📅 2026-04-20
- [x] Merge PR ✅ 2026-04-14
```

---

## 7. Standup settings

```json
"standup": {
  "dir": "${HOME}/Code/brain/standups/daily"
}
```

### `standup.dir`
Directory containing daily standup markdown files.

Expected naming pattern:
- `YYYY-MM-DD.md`

The standup parser expects repo sections and bullets, for example:

```md
## Yesterday
### DamageLabs/command-center
- PRs
  - Finish Angular cutover
- Issues
  - Add API smoke coverage
```

---

## 8. Calendar settings

Calendar URLs are configured through environment variables rather than the main JSON config.

### Supported env vars
Use either:
- `CALENDAR_URLS` as a comma-separated list

or legacy variables:
- `CAL_1`
- `CAL_2`

Example:

```env
CALENDAR_URLS=https://example.com/a.ics,https://example.com/b.ics
```

or:

```env
CAL_1=https://example.com/a.ics
CAL_2=https://example.com/b.ics
```

The loader merges and de-duplicates these values.

If no calendar URLs are provided, the calendar view is disabled and the app emits a startup warning.

---

## 9. Environment variables

### `COMMAND_CENTER_CONFIG`
Optional override for the config file path.

Example:

```env
COMMAND_CENTER_CONFIG=./config.local.json
```

### Calendar vars
- `CALENDAR_URLS`
- `CAL_1`
- `CAL_2`

### Other optional env vars
Some optional integrations may also use additional environment variables.

Keep personal or machine-specific secrets local, preferably in `.env`, and out of committed docs and config files.

---

## 10. What happens when config is missing

The config loader emits warnings when optional features are not configured.

Common warning conditions include:
- no `github.trackedRepos`
- no `github.orgs`
- missing `obsidian.tasksDir` or `obsidian.taskFiles`
- missing `obsidian.dailyDir`
- missing `obsidian.decisionsDir`
- missing `standup.dir`
- no calendar URLs

This is intentional. The app is designed to degrade gracefully instead of refusing to start.

---

## 11. Recommended config hygiene

- keep `config.local.json` uncommitted and machine-specific
- keep secrets in `.env` instead of checked-in JSON
- prefer `127.0.0.1` unless you intentionally want LAN access
- use `${HOME}` or `~` for portable local paths
- start from `config.example.json`, then trim or expand for your setup

---

## 12. Quick validation checklist

After updating config, check:

```bash
npm run check
npm test
```

Then verify the live app:

```bash
curl http://127.0.0.1:4500/api/issues
curl http://127.0.0.1:4500/api/tasks
curl http://127.0.0.1:4500/api/calendar
curl http://127.0.0.1:4500/api/openclaw
```

If a panel is empty, confirm the corresponding local path, CLI auth, or environment variable is actually present and valid on the machine running the app.
