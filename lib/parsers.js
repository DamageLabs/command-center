'use strict';

function parseTaskRecord(raw, label, color, section, completed = false) {
  const dueMatch = raw.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
  const completedAtMatch = raw.match(/✅\s*(\d{4}-\d{2}-\d{2})/);
  const title = raw
    .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/✅\s*\d{4}-\d{2}-\d{2}/g, '')
    .replace(/#\w+/g, '')
    .replace(/🔁[^\n]*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!title) return null;
  return {
    title,
    source: label,
    color,
    section,
    due: dueMatch ? dueMatch[1] : null,
    recurring: raw.includes('🔁'),
    completed,
    completedAt: completedAtMatch ? completedAtMatch[1] : null,
  };
}

function parseStandupSections(content) {
  const yesterdayMatch = content.match(/## Yesterday\s*\n([\s\S]*?)(?=\n## [^\n]+|$)/);
  const yesterday = (yesterdayMatch ? yesterdayMatch[1] : content).trim();
  const lines = yesterday.split('\n');
  const sections = [];

  let current = null;
  let currentCategory = null;

  const finalizeCurrent = () => {
    if (!current) return;

    if (current.noActivity) {
      sections.push({
        repo: current.repo,
        stats: '',
        bullets: [current.noActivity],
      });
      current = null;
      currentCategory = null;
      return;
    }

    const nonEmptyCategories = current.categories.filter(cat => cat.items.length || cat.label);
    const stats = nonEmptyCategories
      .filter(cat => cat.items.length)
      .map(cat => `${cat.items.length} ${cat.label}`)
      .join(' · ');

    const bullets = [];
    for (const cat of nonEmptyCategories) {
      if (!cat.items.length) {
        bullets.push(cat.label);
        continue;
      }
      for (const item of cat.items) {
        bullets.push(`${cat.label}: ${item}`);
        if (bullets.length >= 4) break;
      }
      if (bullets.length >= 4) break;
    }

    sections.push({
      repo: current.repo,
      stats,
      bullets: bullets.length ? bullets : ['No parsed items'],
    });

    current = null;
    currentCategory = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (line.startsWith('### ')) {
      finalizeCurrent();
      current = { repo: line.slice(4).trim(), noActivity: null, categories: [] };
      currentCategory = null;
      continue;
    }

    if (!current) continue;

    if (/^- No (GitHub )?activity/i.test(trimmed)) {
      current.noActivity = trimmed.replace(/^-\s*/, '').replace(/\.$/, '');
      currentCategory = null;
      continue;
    }

    if (/^\s+- /.test(line) && !/^- /.test(line) && currentCategory) {
      currentCategory.items.push(
        trimmed.replace(/^-\s*/, '').replace(/\*Closes[^*]*\*/g, '').replace(/`/g, '').trim()
      );
      continue;
    }

    if (/^- /.test(line)) {
      const label = trimmed.replace(/^-\s*/, '').replace(/:$/, '').trim();
      currentCategory = { label, items: [] };
      current.categories.push(currentCategory);
      continue;
    }
  }

  finalizeCurrent();
  return sections;
}

function extractDailyNotePreview(noteContent, noteDate, now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());

  const body = noteContent.replace(/^---[\s\S]*?---\n/, '');
  const clean = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/>[^\n]*/g, '')
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/\[\[[^\]|]*(?:\|([^\]]+))?\]\]/g, (_, alt) => alt || '')
    .replace(/#{1,6}\s/g, '')
    .trim();
  const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 20);

  return {
    date: noteDate,
    preview: lines.slice(0, 3).join(' ').substring(0, 300),
    isToday: noteDate === `${year}-${month}-${day}`,
  };
}

function extractDecisionSummary(content, fileName) {
  const titleMatch = content.match(/^#\s+(.+)/m);
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.+)/i);
  const dateMatch = content.match(/\*\*Date:\*\*\s*(\S+)/i);
  const contextLines = content.split('\n')
    .filter(line => line.trim().length > 20 && !line.startsWith('#') && !line.startsWith('**'))
    .slice(0, 2)
    .join(' ')
    .substring(0, 200);

  return {
    title: titleMatch ? titleMatch[1].replace('Decision: ', '') : fileName.replace('.md', ''),
    status: statusMatch ? statusMatch[1].trim() : null,
    date: dateMatch ? dateMatch[1].trim() : fileName.substring(0, 10),
    preview: contextLines,
    file: fileName.replace('.md', ''),
  };
}

function normalizeCalendarText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function calendarPreference(event) {
  if (event?.calendar === 'Work') return 2;
  if (event?.calendar === 'Personal') return 1;
  return 0;
}

function calendarDetailScore(event) {
  return ['location', 'description']
    .filter(key => Boolean(event?.[key]))
    .length;
}

function choosePreferredCalendarEvent(current, candidate) {
  if (!current) return candidate;

  const currentPreference = calendarPreference(current);
  const candidatePreference = calendarPreference(candidate);

  let winner = current;
  let backup = candidate;

  if (candidatePreference > currentPreference) {
    winner = candidate;
    backup = current;
  } else if (candidatePreference === currentPreference) {
    const currentDetailScore = calendarDetailScore(current);
    const candidateDetailScore = calendarDetailScore(candidate);

    if (candidateDetailScore > currentDetailScore) {
      winner = candidate;
      backup = current;
    }
  }

  return {
    ...winner,
    location: winner.location || backup.location || null,
    description: winner.description || backup.description || null,
  };
}

function dedupeCalendarEvents(events = []) {
  const deduped = new Map();

  for (const event of events) {
    const key = [
      normalizeCalendarText(event.title),
      event.start,
      event.end,
    ].join('|');

    deduped.set(key, choosePreferredCalendarEvent(deduped.get(key), event));
  }

  return [...deduped.values()];
}

module.exports = {
  parseTaskRecord,
  parseStandupSections,
  extractDailyNotePreview,
  extractDecisionSummary,
  dedupeCalendarEvents,
};
