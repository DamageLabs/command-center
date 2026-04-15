import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AnalyticsResponse,
  CalendarResponse,
  CloseIssueResponse,
  InfraResponse,
  IssuesResponse,
  NotesResponse,
  OpenClawResponse,
  PrsResponse,
  RefreshResponse,
  ReposResponse,
  StandupResponse,
  TasksResponse,
} from '../../models/api';

@Injectable({ providedIn: 'root' })
export class CommandCenterApiService {
  private readonly http = inject(HttpClient);

  getIssues(): Observable<IssuesResponse> {
    return this.http.get<IssuesResponse>('/api/issues');
  }

  getRepos(): Observable<ReposResponse> {
    return this.http.get<ReposResponse>('/api/repos');
  }

  getCalendar(): Observable<CalendarResponse> {
    return this.http.get<CalendarResponse>('/api/calendar');
  }

  getInfra(): Observable<InfraResponse> {
    return this.http.get<InfraResponse>('/api/infra');
  }

  getTasks(): Observable<TasksResponse> {
    return this.http.get<TasksResponse>('/api/tasks');
  }

  getPrs(): Observable<PrsResponse> {
    return this.http.get<PrsResponse>('/api/prs');
  }

  getStandup(): Observable<StandupResponse> {
    return this.http.get<StandupResponse>('/api/standup');
  }

  getAnalytics(): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>('/api/analytics');
  }

  getNotes(): Observable<NotesResponse> {
    return this.http.get<NotesResponse>('/api/notes');
  }

  getOpenClaw(): Observable<OpenClawResponse> {
    return this.http.get<OpenClawResponse>('/api/openclaw');
  }

  refreshAll(): Observable<RefreshResponse> {
    return this.http.post<RefreshResponse>('/api/refresh', {});
  }

  closeIssue(owner: string, repo: string, number: number): Observable<CloseIssueResponse> {
    return this.http.post<CloseIssueResponse>(`/api/issues/${owner}/${repo}/${number}/close`, {});
  }
}
