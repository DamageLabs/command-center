export interface SourceMeta {
  key: string;
  label: string;
  status: string;
  loading: boolean;
  stale: boolean;
  updatedAt: number | null;
  ageMs: number | null;
  lastAttemptAt: number | null;
  error: string | null;
  errorAt: number | null;
  staleAfterMs: number;
}

export interface ApiEnvelope {
  ok: boolean;
  source: SourceMeta;
  error?: string;
  updatedAt?: number | string | null;
}

export interface IssueAssignee {
  id?: string;
  login?: string;
  name?: string;
}

export interface IssueLabel {
  id?: string;
  name: string;
  description?: string | null;
  color?: string;
}

export interface IssueMilestone {
  number: number;
  title: string;
  description?: string | null;
  dueOn?: string | null;
}

export interface IssueItem {
  assignees: IssueAssignee[];
  createdAt: string;
  labels: IssueLabel[];
  milestone: IssueMilestone | null;
  number: number;
  title: string;
  url: string;
  repo: string;
  repoFull: string;
  priority: string;
}

export interface IssuesResponse extends ApiEnvelope {
  urgent: IssueItem[];
  active: IssueItem[];
  deferred: IssueItem[];
  total: number;
  updatedAt: number | null;
}

export interface IssuesViewModel {
  urgent: IssueItem[];
  active: IssueItem[];
  deferred: IssueItem[];
  total: number;
  counts: {
    urgent: number;
    active: number;
    deferred: number;
  };
  updatedAt: number | null;
}

export interface RepoSummary {
  repo: string;
  repoFull: string;
  openIssues: number;
  bugs: number;
  enhancements: number;
  lastActivity: string | null;
  tracked: boolean;
  archived: boolean;
}

export interface ReposResponse extends ApiEnvelope {
  repos: RepoSummary[];
  updatedAt: number | null;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendar: string;
  location?: string | null;
}

export interface CalendarResponse extends ApiEnvelope {
  events: CalendarEvent[];
  updatedAt: number | null;
}

export interface InfraProcess {
  id: number;
  name: string;
  status: string;
  pid: number;
  uptime: number | null;
  restarts: number;
  cpu: number;
  memory: number;
}

export interface InfraResponse extends ApiEnvelope {
  processes: InfraProcess[];
  updatedAt: number | null;
}

export interface TaskItem {
  title: string;
  source: string;
  section?: string | null;
  recurring?: boolean;
  due?: string | null;
  color: string;
  completedAt?: string | null;
}

export interface TasksResponse extends ApiEnvelope {
  tasks: TaskItem[];
  completedTasks: TaskItem[];
  updatedAt: number | null;
}

export interface PullRequestAuthor {
  login?: string;
}

export interface PullRequestItem {
  number: number;
  title: string;
  url: string;
  repo: string;
  repoFull: string;
  headRefName: string;
  author?: PullRequestAuthor | null;
  createdAt: string;
  isDraft: boolean;
  reviewDecision?: string | null;
}

export interface PrsResponse extends ApiEnvelope {
  prs: PullRequestItem[];
  updatedAt: number | null;
}

export interface StandupSection {
  repo: string;
  stats: string;
  bullets: string[];
}

export interface StandupSummary {
  title: string;
  date: string;
  isToday: boolean;
  sections: StandupSection[];
}

export interface StandupResponse extends ApiEnvelope {
  standup: StandupSummary | null;
  updatedAt: number | null;
}

export interface AnalyticsTotals {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface AnalyticsSite {
  name: string;
  domain: string;
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
}

export interface AnalyticsResponse extends ApiEnvelope {
  totals: AnalyticsTotals;
  sites: AnalyticsSite[];
  range: string;
  updatedAt: string | null;
}

export interface DailyNote {
  date: string;
  isToday: boolean;
  preview: string;
}

export interface DecisionNote {
  title: string;
  date: string;
  status?: string | null;
  preview: string;
}

export interface NotesResponse extends ApiEnvelope {
  dailyNote: DailyNote | null;
  decisions: DecisionNote[];
}

export interface OpenClawGatewaySelf {
  host: string;
  ip: string;
  version: string;
  platform: string;
}

export interface OpenClawGateway {
  mode: string;
  url: string;
  urlSource?: string | null;
  misconfigured: boolean;
  reachable: boolean;
  connectLatencyMs?: number | null;
  self?: OpenClawGatewaySelf | null;
  error?: string | null;
  authWarning?: string | null;
}

export interface OpenClawServiceRuntime {
  status: string;
  state: string;
  subState?: string | null;
  pid?: number | null;
  lastExitStatus?: number | null;
  lastExitReason?: string | null;
}

export interface OpenClawServiceStatus {
  label: string;
  installed: boolean;
  loaded: boolean;
  managedByOpenClaw: boolean;
  externallyManaged: boolean;
  loadedText?: string | null;
  runtime?: OpenClawServiceRuntime | null;
  runtimeShort?: string | null;
}

export interface OpenClawAgentStatus {
  id: string;
  name: string;
  workspaceDir: string;
  bootstrapPending: boolean;
  sessionsPath: string;
  sessionsCount: number;
  lastUpdatedAt?: number | null;
  lastActiveAgeMs?: number | null;
}

export interface OpenClawAgentsSummary {
  defaultId?: string | null;
  agents: OpenClawAgentStatus[];
  totalSessions: number;
  bootstrapPendingCount: number;
}

export interface OpenClawMemoryPlugin {
  enabled: boolean;
  slot?: string | null;
}

export interface OpenClawProcessSnapshot {
  elapsed: string;
  memoryBytes: number | null;
}

export interface OpenClawTasksSummary {
  total: number;
  active: number;
  terminal: number;
  failures: number;
  byStatus?: Record<string, number>;
  byRuntime?: Record<string, number>;
}

export interface OpenClawTaskAudit {
  total: number;
  warnings: number;
  errors: number;
  byCode?: Record<string, number>;
}

export interface OpenClawSessionSummary {
  key: string;
  sessionId: string;
  agent: string;
  type: string;
  name: string;
  model: string;
  updatedAt: number;
  ageMs: number;
  active: boolean;
  percentUsed: number | null;
  totalTokens: number;
  contextTokens: number | null;
  estimatedCostUsd: number | null;
  chatType?: string | null;
  label?: string | null;
  subject?: string | null;
  spawnedBy?: string | null;
  abortedLastRun: boolean;
}

export interface OpenClawRunSummary extends OpenClawSessionSummary {
  durationSec: number | null;
  status: string;
}

export interface OpenClawLogEntry {
  timestamp: number;
  seenAt: string;
  level: string;
  source: string;
  message: string;
}

export interface OpenClawErrorOccurrence {
  timestamp: number;
  source: string;
  level: string;
  message: string;
}

export interface OpenClawErrorGroup {
  signature: string;
  source: string;
  severity: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  sampleMessage: string;
  lastOccurrences: OpenClawErrorOccurrence[];
}

export interface OpenClawResponse extends ApiEnvelope {
  version: string | null;
  gateway: OpenClawGateway | null;
  gatewayService: OpenClawServiceStatus | null;
  gatewayProcess?: OpenClawProcessSnapshot | null;
  nodeService: OpenClawServiceStatus | null;
  agents: OpenClawAgentsSummary | null;
  sessions?: unknown;
  memory?: unknown;
  memoryPlugin: OpenClawMemoryPlugin | null;
  tasks?: OpenClawTasksSummary | null;
  taskAudit?: OpenClawTaskAudit | null;
  channelSummary?: string[];
  activeSessions: OpenClawSessionSummary[];
  recentRuns: OpenClawRunSummary[];
  logsTail: OpenClawLogEntry[];
  errorFeed: OpenClawErrorGroup[];
  logsError?: string | null;
  updateAvailable?: boolean | null;
  updateChannel?: string | null;
  updateInfo?: { latestVersion?: string | null } | null;
  secretDiagnostics: unknown[];
  updatedAt: number | null;
}

export interface RefreshResponse {
  ok: boolean;
}

export interface CloseIssueResponse {
  ok: boolean;
  error?: string;
}
