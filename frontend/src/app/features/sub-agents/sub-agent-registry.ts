export type SubAgentId = 'scout' | 'scope' | 'patch' | 'proof' | 'trace' | 'ink' | 'index' | 'second-look' | 'watch';

export interface SubAgentDefinition {
  id: SubAgentId;
  displayName: string;
  operationalName: string;
  role: string;
  spawnWhen: string;
  description: string;
  portraitPath: string;
  goodTasks: string[];
  badTasks: string[];
  outputContract: string[];
  bindingTerms: string[];
}

export const SUB_AGENTS: SubAgentDefinition[] = [
  {
    id: 'scout',
    displayName: 'Owl',
    operationalName: 'Scout',
    role: 'Repo scout and architecture mapper',
    spawnWhen: 'Use when Atlas needs fast orientation in an unfamiliar codebase before deciding where to act.',
    description: 'Scout maps the real shape of a repo, finds the likely entrypoints, and identifies where the work probably lives.',
    portraitPath: '/atlas/sub-agents/scout.png',
    goodTasks: [
      'Map boot flow and key modules',
      'Identify frontend/backend boundaries',
      'Find the likely files for a bug or feature',
    ],
    badTasks: [
      'Freeform implementation',
      'Roadmap decisions',
      'Broad architecture rewrites on its own',
    ],
    outputContract: [
      'Entry points and important files',
      'Data flow summary',
      'Risky/confusing areas',
      'Recommended starting point',
    ],
    bindingTerms: ['scout'],
  },
  {
    id: 'scope',
    displayName: 'Veidt',
    operationalName: 'Scope',
    role: 'Issue triage and scope-definer',
    spawnWhen: 'Use when a bug or issue needs hidden-scope analysis before coding starts.',
    description: 'Scope turns a vague request into an implementation plan with real boundaries, dependencies, and test expectations.',
    portraitPath: '/atlas/sub-agents/scope.png',
    goodTasks: [
      'Break a GitHub issue into implementation slices',
      'Separate real scope from apparent scope',
      'Recommend touched files and test plan',
    ],
    badTasks: [
      'Unbounded coding',
      'Opening issues by itself',
      'Roadmap prioritization without Atlas',
    ],
    outputContract: [
      'Likely root area',
      'Hidden dependencies',
      'Implementation order',
      'Validation plan',
    ],
    bindingTerms: ['scope'],
  },
  {
    id: 'patch',
    displayName: 'Blue',
    operationalName: 'Patch',
    role: 'Bounded implementer',
    spawnWhen: 'Use when the task is already scoped and Atlas wants a focused implementation pass.',
    description: 'Patch makes one concrete change at a time, with a clear boundary, explicit files, and defined acceptance criteria.',
    portraitPath: '/atlas/sub-agents/patch.png',
    goodTasks: [
      'One bug fix',
      'One view or component adjustment',
      'One API or parser extension',
    ],
    badTasks: [
      'Repo-wide cleanup',
      'Parallel product invention',
      'Refactors without a schema',
    ],
    outputContract: [
      'Changed files',
      'What changed and why',
      'Commands run',
      'Known follow-ups',
    ],
    bindingTerms: ['patch'],
  },
  {
    id: 'proof',
    displayName: 'Rorschach',
    operationalName: 'Proof',
    role: 'Verifier and regression runner',
    spawnWhen: 'Use when Atlas already has a candidate fix and needs hard evidence that it worked.',
    description: 'Proof validates behavior with tests, smoke checks, route verification, and before/after comparisons.',
    portraitPath: '/atlas/sub-agents/proof.png',
    goodTasks: [
      'Run tests and smoke checks',
      'Verify routes or endpoints',
      'Confirm issue acceptance criteria',
    ],
    badTasks: [
      'Product calls',
      'Broad rewrites',
      'Speculative fixes without evidence',
    ],
    outputContract: [
      'Commands run',
      'Pass/fail by check',
      'Exact failures',
      'Confidence and unknowns',
    ],
    bindingTerms: ['proof'],
  },
  {
    id: 'trace',
    displayName: 'Glass',
    operationalName: 'Trace',
    role: 'Runtime and log forensics',
    spawnWhen: 'Use when something is failing live and Atlas needs grouped symptoms plus likely causes.',
    description: 'Trace reads logs, cron output, service state, and runtime traces to turn noisy failures into ranked explanations.',
    portraitPath: '/atlas/sub-agents/trace.png',
    goodTasks: [
      'Group recurring log failures',
      'Diagnose service and cron issues',
      'Rank likely causes with evidence',
    ],
    badTasks: [
      'Speculative architecture critique',
      'Blind code changes',
      'Implementation without evidence',
    ],
    outputContract: [
      'Grouped failure signatures',
      'Ranked likely causes',
      'Evidence snippets',
      'Immediate next checks',
    ],
    bindingTerms: ['trace'],
  },
  {
    id: 'ink',
    displayName: 'Mason',
    operationalName: 'Ink',
    role: 'Docs and runbook writer',
    spawnWhen: 'Use when working knowledge should become durable documentation that matches reality.',
    description: 'Ink turns live workflows, code behavior, and practical setup knowledge into runbooks, guides, and durable canon.',
    portraitPath: '/atlas/sub-agents/ink.png',
    goodTasks: [
      'Write runbooks',
      'Capture setup guides',
      'Summarize architecture after code review',
    ],
    badTasks: [
      'Speculative docs',
      'Marketing copy without review',
      'Public messaging on its own',
    ],
    outputContract: [
      'Document draft or patch',
      'Assumptions made',
      'Commands or paths verified',
      'Open questions',
    ],
    bindingTerms: ['ink'],
  },
  {
    id: 'index',
    displayName: 'Archive',
    operationalName: 'Index',
    role: 'Structured extractor and fact organizer',
    spawnWhen: 'Use when Atlas needs broad evidence collected into a normalized fact set.',
    description: 'Index gathers facts across files, repos, logs, or transcripts and returns them in a structured shape Atlas can reason over.',
    portraitPath: '/atlas/sub-agents/index.png',
    goodTasks: [
      'Config or repo inventory',
      'API shape comparisons',
      'Backlog or source-of-truth extraction',
    ],
    badTasks: [
      'Freeform writing',
      'Judgment-heavy decisions',
      'Unstructured brainstorming',
    ],
    outputContract: [
      'Normalized fact set',
      'Field-level comparisons',
      'Source locations',
      'Obvious gaps or mismatches',
    ],
    bindingTerms: ['index'],
  },
  {
    id: 'second-look',
    displayName: 'Spectre',
    operationalName: 'Second Look',
    role: 'Reviewer and scope checker',
    spawnWhen: 'Use when Atlas wants one adversarial review pass before calling something done.',
    description: 'Second Look checks for scope creep, suspicious diffs, weak evidence, and whether the result actually matches the request.',
    portraitPath: '/atlas/sub-agents/second-look.png',
    goodTasks: [
      'Pre-PR review',
      'Scope drift checks',
      '“Did we actually fix the requested thing?” passes',
    ],
    badTasks: [
      'Owning implementation',
      'Redefining the task',
      'Independent user communication',
    ],
    outputContract: [
      'What looks solid',
      'What looks suspicious',
      'What is out of scope',
      'What still lacks evidence',
    ],
    bindingTerms: ['second look', 'second-look', 'secondlook'],
  },
  {
    id: 'watch',
    displayName: 'Clock',
    operationalName: 'Watch',
    role: 'Monitor and anomaly surfacer',
    spawnWhen: 'Use when Atlas wants quiet heartbeat-style monitoring that notices meaningful changes before they become surprises.',
    description: 'Watch keeps an eye on services, cron jobs, queues, and drifting runtime state, then surfaces only the changes that actually deserve attention.',
    portraitPath: '/atlas/sub-agents/watch.png',
    goodTasks: [
      'Heartbeat monitoring',
      'Missed cron or stale service detection',
      'High-signal anomaly surfacing',
    ],
    badTasks: [
      'Deep debugging instead of Trace',
      'Noisy constant status chatter',
      'Declaring incidents without evidence',
    ],
    outputContract: [
      'What changed',
      'Why it matters or does not',
      'Recommended next action',
      'Whether Atlas should notify, investigate, or stay quiet',
    ],
    bindingTerms: ['watch'],
  },
];
