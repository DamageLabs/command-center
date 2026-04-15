import { inject, Injectable, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { CommandCenterApiService } from '../api/command-center-api.service';
import {
  AnalyticsResponse,
  CalendarResponse,
  InfraResponse,
  IssuesResponse,
  IssuesViewModel,
  NotesResponse,
  OpenClawResponse,
  PrsResponse,
  ReposResponse,
  StandupResponse,
  TasksResponse,
} from '../../models/api';
import { createDashboardResource } from './create-dashboard-resource';
import { DashboardResource } from './resource-state';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly api = inject(CommandCenterApiService);

  readonly refreshingAll = signal(false);

  private issuesResource?: DashboardResource<IssuesViewModel>;
  private reposResource?: DashboardResource<ReposResponse['repos']>;
  private calendarResource?: DashboardResource<CalendarResponse['events']>;
  private infraResource?: DashboardResource<InfraResponse['processes']>;
  private tasksResource?: DashboardResource<{ open: TasksResponse['tasks']; completed: TasksResponse['completedTasks'] }>;
  private prsResource?: DashboardResource<PrsResponse['prs']>;
  private standupResource?: DashboardResource<StandupResponse['standup']>;
  private analyticsResource?: DashboardResource<{ totals: AnalyticsResponse['totals']; sites: AnalyticsResponse['sites']; range: AnalyticsResponse['range']; updatedAt: AnalyticsResponse['updatedAt'] }>;
  private notesResource?: DashboardResource<{ dailyNote: NotesResponse['dailyNote']; decisions: NotesResponse['decisions'] }>;
  private openClawResource?: DashboardResource<{
    version: OpenClawResponse['version'];
    gateway: OpenClawResponse['gateway'];
    gatewayService: OpenClawResponse['gatewayService'];
    gatewayProcess: OpenClawResponse['gatewayProcess'];
    nodeService: OpenClawResponse['nodeService'];
    agents: OpenClawResponse['agents'];
    sessions: OpenClawResponse['sessions'];
    memory: OpenClawResponse['memory'];
    memoryPlugin: OpenClawResponse['memoryPlugin'];
    tasks: OpenClawResponse['tasks'];
    taskAudit: OpenClawResponse['taskAudit'];
    channelSummary: OpenClawResponse['channelSummary'];
    activeSessions: OpenClawResponse['activeSessions'];
    recentRuns: OpenClawResponse['recentRuns'];
    updateAvailable: OpenClawResponse['updateAvailable'];
    updateChannel: OpenClawResponse['updateChannel'];
    updateInfo: OpenClawResponse['updateInfo'];
    secretDiagnostics: OpenClawResponse['secretDiagnostics'];
    updatedAt: OpenClawResponse['updatedAt'];
  }>;

  issues(): DashboardResource<IssuesViewModel> {
    return this.issuesResource ??= createDashboardResource({
      load: () => this.api.getIssues(),
      selectData: (response: IssuesResponse) => ({
        urgent: response.urgent,
        active: response.active,
        deferred: response.deferred,
        total: response.total,
        counts: {
          urgent: response.urgent.length,
          active: response.active.length,
          deferred: response.deferred.length,
        },
        updatedAt: response.updatedAt,
      }),
      isEmpty: (data) => data.total === 0,
      intervalMs: 60_000,
    });
  }

  repos(): DashboardResource<ReposResponse['repos']> {
    return this.reposResource ??= createDashboardResource({
      load: () => this.api.getRepos(),
      selectData: (response: ReposResponse) => response.repos,
      intervalMs: 60_000,
    });
  }

  calendar(): DashboardResource<CalendarResponse['events']> {
    return this.calendarResource ??= createDashboardResource({
      load: () => this.api.getCalendar(),
      selectData: (response: CalendarResponse) => response.events,
      intervalMs: 180_000,
    });
  }

  infra(): DashboardResource<InfraResponse['processes']> {
    return this.infraResource ??= createDashboardResource({
      load: () => this.api.getInfra(),
      selectData: (response: InfraResponse) => response.processes,
      intervalMs: 60_000,
    });
  }

  tasks(): DashboardResource<{ open: TasksResponse['tasks']; completed: TasksResponse['completedTasks'] }> {
    return this.tasksResource ??= createDashboardResource({
      load: () => this.api.getTasks(),
      selectData: (response: TasksResponse) => ({ open: response.tasks, completed: response.completedTasks }),
      isEmpty: (data) => data.open.length === 0 && data.completed.length === 0,
      intervalMs: 60_000,
    });
  }

  prs(): DashboardResource<PrsResponse['prs']> {
    return this.prsResource ??= createDashboardResource({
      load: () => this.api.getPrs(),
      selectData: (response: PrsResponse) => response.prs,
      intervalMs: 60_000,
    });
  }

  standup(): DashboardResource<StandupResponse['standup']> {
    return this.standupResource ??= createDashboardResource({
      load: () => this.api.getStandup(),
      selectData: (response: StandupResponse) => response.standup,
      isEmpty: (data) => data == null,
      intervalMs: 300_000,
    });
  }

  analytics(): DashboardResource<{ totals: AnalyticsResponse['totals']; sites: AnalyticsResponse['sites']; range: AnalyticsResponse['range']; updatedAt: AnalyticsResponse['updatedAt'] }> {
    return this.analyticsResource ??= createDashboardResource({
      load: () => this.api.getAnalytics(),
      selectData: (response: AnalyticsResponse) => ({
        totals: response.totals,
        sites: response.sites,
        range: response.range,
        updatedAt: response.updatedAt,
      }),
      isEmpty: (data) => data.sites.length === 0,
      intervalMs: 300_000,
    });
  }

  notes(): DashboardResource<{ dailyNote: NotesResponse['dailyNote']; decisions: NotesResponse['decisions'] }> {
    return this.notesResource ??= createDashboardResource({
      load: () => this.api.getNotes(),
      selectData: (response: NotesResponse) => ({ dailyNote: response.dailyNote, decisions: response.decisions }),
      isEmpty: (data) => !data.dailyNote && data.decisions.length === 0,
      intervalMs: 180_000,
    });
  }

  openClaw(): DashboardResource<{
    version: OpenClawResponse['version'];
    gateway: OpenClawResponse['gateway'];
    gatewayService: OpenClawResponse['gatewayService'];
    gatewayProcess: OpenClawResponse['gatewayProcess'];
    nodeService: OpenClawResponse['nodeService'];
    agents: OpenClawResponse['agents'];
    sessions: OpenClawResponse['sessions'];
    memory: OpenClawResponse['memory'];
    memoryPlugin: OpenClawResponse['memoryPlugin'];
    tasks: OpenClawResponse['tasks'];
    taskAudit: OpenClawResponse['taskAudit'];
    channelSummary: OpenClawResponse['channelSummary'];
    activeSessions: OpenClawResponse['activeSessions'];
    recentRuns: OpenClawResponse['recentRuns'];
    updateAvailable: OpenClawResponse['updateAvailable'];
    updateChannel: OpenClawResponse['updateChannel'];
    updateInfo: OpenClawResponse['updateInfo'];
    secretDiagnostics: OpenClawResponse['secretDiagnostics'];
    updatedAt: OpenClawResponse['updatedAt'];
  }> {
    return this.openClawResource ??= createDashboardResource({
      load: () => this.api.getOpenClaw(),
      selectData: (response: OpenClawResponse) => ({
        version: response.version,
        gateway: response.gateway,
        gatewayService: response.gatewayService,
        gatewayProcess: response.gatewayProcess,
        nodeService: response.nodeService,
        agents: response.agents,
        sessions: response.sessions,
        memory: response.memory,
        memoryPlugin: response.memoryPlugin,
        tasks: response.tasks,
        taskAudit: response.taskAudit,
        channelSummary: response.channelSummary,
        activeSessions: response.activeSessions,
        recentRuns: response.recentRuns,
        updateAvailable: response.updateAvailable,
        updateChannel: response.updateChannel,
        updateInfo: response.updateInfo,
        secretDiagnostics: response.secretDiagnostics,
        updatedAt: response.updatedAt,
      }),
      isEmpty: () => false,
      intervalMs: 60_000,
    });
  }

  closeIssue(repoFull: string, number: number): void {
    const [owner, repo] = repoFull.split('/');
    if (!owner || !repo) return;

    this.api.closeIssue(owner, repo, number).pipe(take(1)).subscribe({
      next: () => {
        this.issuesResource?.refresh();
      },
      error: () => {
        this.issuesResource?.refresh();
      },
    });
  }

  refreshAll(): void {
    if (this.refreshingAll()) return;

    this.refreshingAll.set(true);

    this.api.refreshAll().pipe(
      take(1),
      finalize(() => this.refreshingAll.set(false))
    ).subscribe({
      next: () => this.triggerRefreshes(),
      error: () => this.triggerRefreshes(),
    });
  }

  private triggerRefreshes(): void {
    this.issuesResource?.refresh();
    this.reposResource?.refresh();
    this.calendarResource?.refresh();
    this.infraResource?.refresh();
    this.tasksResource?.refresh();
    this.prsResource?.refresh();
    this.standupResource?.refresh();
    this.analyticsResource?.refresh();
    this.notesResource?.refresh();
    this.openClawResource?.refresh();
  }
}
