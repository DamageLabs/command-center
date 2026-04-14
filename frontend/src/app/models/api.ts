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

export interface IssuesResponse {
  ok: boolean;
  urgent: unknown[];
  active: unknown[];
  deferred: unknown[];
  total: number;
  updatedAt: number | null;
  source: SourceMeta;
}

export interface IssuesSummary {
  total: number;
  urgent: number;
  active: number;
  deferred: number;
  updatedAt: number | null;
  source: SourceMeta;
}
