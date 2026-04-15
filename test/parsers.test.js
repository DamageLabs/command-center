'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseTaskRecord,
  parseStandupSections,
  extractDailyNotePreview,
  extractDecisionSummary,
  dedupeCalendarEvents,
} = require('../lib/parsers');

test('parseTaskRecord strips metadata and keeps due date/recurring state', () => {
  const task = parseTaskRecord('Ship #todo dashboard polish 📅 2026-04-20 🔁 every week', 'Work', 'blue', 'Sprint', false);

  assert.deepEqual(task, {
    title: 'Ship dashboard polish',
    source: 'Work',
    color: 'blue',
    section: 'Sprint',
    due: '2026-04-20',
    recurring: true,
    completed: false,
    completedAt: null,
  });
});

test('parseTaskRecord captures completion date for completed tasks', () => {
  const task = parseTaskRecord('Merge PR ✅ 2026-04-14', 'Work', 'blue', 'Done', true);

  assert.equal(task.completed, true);
  assert.equal(task.completedAt, '2026-04-14');
  assert.equal(task.title, 'Merge PR');
});

test('parseStandupSections handles nested bullets and trims close markers', () => {
  const content = `# Daily Standup\n\n## Yesterday\n### DamageLabs/command-center\n- PRs\n  - Finish Angular cutover *Closes #73*\n- Issues\n  - Add API smoke coverage\n### DamageLabs/openclaw-ops\n- No activity.\n\n## Today\n- keep going\n`;

  const sections = parseStandupSections(content);

  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0], {
    repo: 'DamageLabs/command-center',
    stats: '1 PRs · 1 Issues',
    bullets: ['PRs: Finish Angular cutover', 'Issues: Add API smoke coverage'],
  });
  assert.deepEqual(sections[1], {
    repo: 'DamageLabs/openclaw-ops',
    stats: '',
    bullets: ['No activity'],
  });
});

test('extractDailyNotePreview strips frontmatter, embeds, code blocks, and wiki links', () => {
  const note = `---\ntags: [daily]\n---\n# Heading\n![[image.png]]\n\nThis is the first real paragraph with enough text to keep.\n\n> ignore quote\n\n[[DamageLabs/command-center|Command Center]] got the Angular cutover done.\n\n\`\`\`js\nconsole.log('ignore me')\n\`\`\`\n\nAnother paragraph with enough text to keep as well.`;

  const preview = extractDailyNotePreview(note, '2026-04-14', new Date('2026-04-14T12:00:00Z'));

  assert.equal(preview.date, '2026-04-14');
  assert.equal(preview.isToday, true);
  assert.match(preview.preview, /This is the first real paragraph/);
  assert.match(preview.preview, /Command Center got the Angular cutover done/);
  assert.doesNotMatch(preview.preview, /console\.log/);
  assert.doesNotMatch(preview.preview, /image\.png/);
});

test('extractDecisionSummary prefers explicit metadata when present', () => {
  const content = `# Decision: Ship Angular as default UI\n\n**Status:** Accepted\n**Date:** 2026-04-14\n\nThis decision locks in Angular as the shipped frontend.\n\nSecond supporting sentence with more context.`;

  const summary = extractDecisionSummary(content, '2026-04-14-ship-angular.md');

  assert.deepEqual(summary, {
    title: 'Ship Angular as default UI',
    status: 'Accepted',
    date: '2026-04-14',
    preview: 'This decision locks in Angular as the shipped frontend. Second supporting sentence with more context.',
    file: '2026-04-14-ship-angular',
  });
});

test('dedupeCalendarEvents prefers Work entries for duplicate events', () => {
  const events = [
    {
      title: 'Flight to Denver (UA 2479)',
      start: '2026-04-30T21:35:00.000Z',
      end: '2026-04-30T23:57:00.000Z',
      allDay: false,
      calendar: 'Personal',
      location: null,
      description: 'Personal copy',
    },
    {
      title: ' Flight   to Denver (UA 2479) ',
      start: '2026-04-30T21:35:00.000Z',
      end: '2026-04-30T23:57:00.000Z',
      allDay: false,
      calendar: 'Work',
      location: 'San Antonio SAT',
      description: null,
    },
  ];

  const deduped = dedupeCalendarEvents(events);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].calendar, 'Work');
  assert.equal(deduped[0].location, 'San Antonio SAT');
  assert.equal(deduped[0].description, 'Personal copy');
});

test('dedupeCalendarEvents keeps distinct events when times differ', () => {
  const events = [
    {
      title: 'Bellamy Brothers',
      start: '2026-05-09T00:00:00.000Z',
      end: '2026-05-09T00:30:00.000Z',
      allDay: false,
      calendar: 'Personal',
    },
    {
      title: 'Bellamy Brothers',
      start: '2026-05-09T01:00:00.000Z',
      end: '2026-05-09T01:30:00.000Z',
      allDay: false,
      calendar: 'Work',
    },
  ];

  const deduped = dedupeCalendarEvents(events);

  assert.equal(deduped.length, 2);
});
