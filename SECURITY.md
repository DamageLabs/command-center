# Security Policy

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security-sensitive bugs.

Instead, report vulnerabilities privately to the maintainer through a trusted direct channel.

When reporting, include:
- a clear summary of the issue
- affected area or file(s)
- impact and likely severity
- reproduction steps or proof of concept
- any suggested mitigation if you have one

If the report is valid, the goal is to:
1. confirm the issue quickly
2. fix or mitigate it privately
3. publish a coordinated patch
4. disclose responsibly after a fix is available, when appropriate

## Scope

This project is a local-first dashboard that can aggregate sensitive operational data, including:
- GitHub issues and pull requests
- calendar feeds
- local notes and tasks
- analytics data
- infrastructure/runtime status
- OpenClaw runtime data

Please treat any bug affecting data exposure, local file access, secret handling, command execution, auth boundaries, or network exposure as security-sensitive.

## Things we especially care about

Examples include:
- unintended exposure of tokens, calendar URLs, or local file paths
- unsafe command execution
- auth or authorization bypasses
- SSRF or unsafe remote fetch behavior
- XSS in rendered dashboard content
- sensitive data leaking into logs, screenshots, or docs
- misconfiguration that exposes local-only services beyond the intended trust boundary

## Supported versions

Security fixes are generally applied to the current `main` branch.

Older snapshots and stale local forks may not receive backported fixes.

## Hardening guidance

If you run this locally:
- keep secrets in `.env` or ignored local config files, never in committed files
- avoid exposing the dashboard publicly unless you understand the trust boundary
- review reverse proxy, auth, and LAN exposure settings carefully
- rotate any secret that may have been exposed in logs, screenshots, or screenshots committed to docs
- prefer least-privilege credentials for external systems

## Disclosure expectations

Please give the maintainer a reasonable window to investigate and patch before public disclosure.

Good-faith reports intended to improve the project are appreciated.
