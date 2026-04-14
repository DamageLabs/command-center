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

export interface RefreshResponse {
  ok: boolean;
}

export interface CloseIssueResponse {
  ok: boolean;
  error?: string;
}
