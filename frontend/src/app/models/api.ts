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

export interface ReposResponse extends ApiEnvelope {
  repos: unknown[];
  updatedAt: number | null;
}

export interface CalendarResponse extends ApiEnvelope {
  events: unknown[];
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

export interface TasksResponse extends ApiEnvelope {
  tasks: unknown[];
  completedTasks: unknown[];
  updatedAt: number | null;
}

export interface PrsResponse extends ApiEnvelope {
  prs: unknown[];
  updatedAt: number | null;
}

export interface StandupResponse extends ApiEnvelope {
  standup: unknown | null;
  updatedAt: number | null;
}

export interface AnalyticsResponse extends ApiEnvelope {
  totals: unknown;
  sites: unknown[];
  range: string;
  updatedAt: string | null;
}

export interface NotesResponse extends ApiEnvelope {
  daily: unknown;
  decisions: unknown[];
}

export interface RefreshResponse {
  ok: boolean;
}
