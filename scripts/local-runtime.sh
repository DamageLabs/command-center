#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="${HOME}/.config/systemd/user"
API_UNIT="command-center-api.service"
WEB_UNIT="command-center-web.service"

require_systemd_user() {
  if ! systemctl --user status >/dev/null 2>&1; then
    echo "systemd --user is not available in this session." >&2
    exit 1
  fi
}

write_units() {
  mkdir -p "$UNIT_DIR"

  cat >"$UNIT_DIR/$API_UNIT" <<EOF
[Unit]
Description=Command Center API (local dev)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
ExecStartPre=/usr/bin/bash -lc '/usr/bin/fuser -k 4500/tcp || true'
ExecStart=/usr/bin/npm run dev:api
Restart=always
RestartSec=3
KillMode=mixed
TimeoutStopSec=20
Environment=NODE_ENV=development

[Install]
WantedBy=default.target
EOF

  cat >"$UNIT_DIR/$WEB_UNIT" <<EOF
[Unit]
Description=Command Center Web (local dev)
After=network-online.target $API_UNIT
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
ExecStartPre=/usr/bin/bash -lc '/usr/bin/fuser -k 4200/tcp || true'
ExecStart=/usr/bin/npm run dev:web
Restart=always
RestartSec=3
KillMode=mixed
TimeoutStopSec=20
Environment=NODE_ENV=development

[Install]
WantedBy=default.target
EOF

  systemctl --user daemon-reload
}

start_units() {
  systemctl --user enable --now "$API_UNIT" "$WEB_UNIT"
}

stop_units() {
  systemctl --user stop "$API_UNIT" "$WEB_UNIT"
}

restart_units() {
  systemctl --user restart "$API_UNIT" "$WEB_UNIT"
}

status_units() {
  systemctl --user --no-pager --full status "$API_UNIT" "$WEB_UNIT" || true
}

logs_units() {
  journalctl --user -u "$API_UNIT" -u "$WEB_UNIT" "$@"
}

uninstall_units() {
  systemctl --user disable --now "$API_UNIT" "$WEB_UNIT" || true
  rm -f "$UNIT_DIR/$API_UNIT" "$UNIT_DIR/$WEB_UNIT"
  systemctl --user daemon-reload
}

usage() {
  cat <<EOF
Usage: scripts/local-runtime.sh <command> [journalctl args]

Commands:
  install    Write/update the user service units and reload systemd
  start      Install units, then enable and start both services
  stop       Stop both services
  restart    Restart both services
  status     Show systemd status for both services
  logs       Show journal logs for both services (passes through extra args)
  uninstall  Disable, stop, and remove both service units
EOF
}

main() {
  require_systemd_user

  local command="${1:-}"
  shift || true

  case "$command" in
    install)
      write_units
      ;;
    start)
      write_units
      start_units
      ;;
    stop)
      stop_units
      ;;
    restart)
      write_units
      restart_units
      ;;
    status)
      status_units
      ;;
    logs)
      logs_units "$@"
      ;;
    uninstall)
      uninstall_units
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
