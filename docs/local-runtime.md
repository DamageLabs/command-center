# Durable local runtime (Linux)

For interactive development, `npm run dev` is still fine.

For a local dashboard you want to keep alive on a workstation like Spark, use the repo-supported user-level systemd runner instead of `concurrently` or ad hoc background shells.

## Why

This setup keeps the API and Angular dev server supervised independently so one dying process is obvious, restartable, and visible via `systemctl --user`.

## Commands

From the repo root:

```bash
npm run dev:durable:install
npm run dev:durable:start
npm run dev:durable:status
npm run dev:durable:logs
```

Stop or restart later:

```bash
npm run dev:durable:stop
npm run dev:durable:restart
```

Remove the installed user services:

```bash
npm run dev:durable:uninstall
```

## What it installs

The helper writes user services to:

- `~/.config/systemd/user/command-center-api.service`
- `~/.config/systemd/user/command-center-web.service`

Both units restart automatically if the process exits, and each unit reclaims its expected port before starting so stray old dev processes do not block the durable runner.

## Verification

Expected listeners:

- API: `http://127.0.0.1:4500`
- Web: `http://127.0.0.1:4200`

LAN access depends on your `config.local.json` host and Angular dev server host, but the durable runner uses the same repo commands as manual local development.

## Logs

```bash
journalctl --user -u command-center-api.service -u command-center-web.service -n 200 --no-pager
```

Or stream them live:

```bash
npm run dev:durable:logs -- -f
```

## Notes

- This is intended for Linux workstations with `systemd --user` available.
- PM2 can still be useful for other workflows, but it is not required for the durable local dev path.
- The Infra view may still degrade if PM2 is not installed, because that panel reads PM2 state today.
