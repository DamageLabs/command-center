'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || '';

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, override) {
  if (Array.isArray(override)) return [...override];
  if (!isPlainObject(override)) return override;

  const result = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(override)) {
    if (Array.isArray(value)) {
      result[key] = [...value];
    } else if (isPlainObject(value)) {
      result[key] = mergeDeep(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function uniqStrings(values) {
  return [...new Set((values || []).filter(Boolean).map(v => String(v).trim()).filter(Boolean))];
}

function expandHome(value) {
  if (typeof value !== 'string') return value;
  if (!value) return value;
  let expanded = value.replace(/\$\{HOME\}/g, HOME_DIR);
  if (expanded === '~') return HOME_DIR;
  if (expanded.startsWith('~/')) return path.join(HOME_DIR, expanded.slice(2));
  return expanded;
}

function resolveConfigPath() {
  const candidates = [];
  if (process.env.COMMAND_CENTER_CONFIG) {
    candidates.push(path.resolve(ROOT_DIR, process.env.COMMAND_CENTER_CONFIG));
  }
  candidates.push(
    path.join(ROOT_DIR, 'config.local.json'),
    path.join(ROOT_DIR, 'config.json'),
    path.join(ROOT_DIR, 'config.example.json')
  );

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) return filePath;
  }

  return candidates[candidates.length - 1];
}

function readConfigFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function parseCalendarUrls() {
  const urls = [];

  if (process.env.CALENDAR_URLS) {
    urls.push(...process.env.CALENDAR_URLS.split(','));
  }

  urls.push(process.env.CAL_1, process.env.CAL_2);

  return uniqStrings(urls);
}

function normalizeConfig(config) {
  const defaults = {
    server: {
      host: '127.0.0.1',
      port: 4500,
    },
    github: {
      trackedRepos: [],
      orgs: [],
    },
    obsidian: {
      vaultDir: '',
      dailyDir: '',
      decisionsDir: '',
      tasksDir: '',
      taskFiles: [],
    },
    standup: {
      dir: '${HOME}/Code/brain/standups/daily',
    },
    calendar: {
      icalUrls: [],
    },
  };

  const merged = mergeDeep(defaults, config || {});

  const normalized = {
    server: {
      host: expandHome(merged.server?.host || defaults.server.host),
      port: Number(merged.server?.port) || defaults.server.port,
    },
    github: {
      trackedRepos: uniqStrings(merged.github?.trackedRepos),
      orgs: (merged.github?.orgs || [])
        .filter(org => org && typeof org.owner === 'string' && org.owner.trim())
        .map(org => ({
          owner: org.owner.trim(),
          repoLimit: Number(org.repoLimit) || 200,
          includeRepos: uniqStrings(org.includeRepos),
          excludeRepos: uniqStrings(org.excludeRepos),
        })),
    },
    obsidian: {
      vaultDir: expandHome(merged.obsidian?.vaultDir || ''),
      dailyDir: expandHome(merged.obsidian?.dailyDir || ''),
      decisionsDir: expandHome(merged.obsidian?.decisionsDir || ''),
      tasksDir: expandHome(merged.obsidian?.tasksDir || ''),
      taskFiles: (merged.obsidian?.taskFiles || [])
        .filter(file => file && typeof file.file === 'string' && file.file.trim())
        .map(file => ({
          file: file.file.trim(),
          label: typeof file.label === 'string' && file.label.trim() ? file.label.trim() : file.file.trim(),
          color: typeof file.color === 'string' && file.color.trim() ? file.color.trim() : 'amber',
        })),
    },
    standup: {
      dir: expandHome(merged.standup?.dir || defaults.standup.dir),
    },
    calendar: {
      icalUrls: uniqStrings([...(merged.calendar?.icalUrls || []), ...parseCalendarUrls()]),
    },
  };

  if (!normalized.obsidian.dailyDir && normalized.obsidian.vaultDir) {
    normalized.obsidian.dailyDir = path.join(normalized.obsidian.vaultDir, '03 - Periodic', '01 - Daily');
  }

  if (!normalized.obsidian.decisionsDir && normalized.obsidian.vaultDir) {
    normalized.obsidian.decisionsDir = path.join(normalized.obsidian.vaultDir, '08 - Projects', 'DamageLabs', 'Decisions');
  }

  return normalized;
}

function validateConfig(config, configPath) {
  const warnings = [];
  if (!config.github.trackedRepos.length) {
    warnings.push('GitHub PR tracking is disabled because github.trackedRepos is empty.');
  }
  if (!config.github.orgs.length) {
    warnings.push('GitHub repo and issue discovery is disabled because github.orgs is empty.');
  }
  if (!config.obsidian.tasksDir || !config.obsidian.taskFiles.length) {
    warnings.push('Obsidian tasks are disabled because obsidian.tasksDir or obsidian.taskFiles is missing.');
  }
  if (!config.obsidian.dailyDir) {
    warnings.push('Daily notes are disabled because obsidian.dailyDir is not configured.');
  }
  if (!config.obsidian.decisionsDir) {
    warnings.push('Decision notes are disabled because obsidian.decisionsDir is not configured.');
  }
  if (!config.standup.dir) {
    warnings.push('Standups are disabled because standup.dir is not configured.');
  }
  if (!config.calendar.icalUrls.length) {
    warnings.push('Calendar is disabled because no iCal URLs were provided in CALENDAR_URLS, CAL_1, or CAL_2.');
  }

  if (configPath.endsWith('config.example.json')) {
    warnings.unshift('Using config.example.json. Copy it to config.local.json or config.json and customize it for your machine.');
  }

  return warnings;
}

function loadConfig() {
  const configPath = resolveConfigPath();
  const rawConfig = readConfigFile(configPath);
  const config = normalizeConfig(rawConfig);
  const warnings = validateConfig(config, configPath);
  return { config, configPath, warnings };
}

module.exports = {
  loadConfig,
};
