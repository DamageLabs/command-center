import { Routes } from '@angular/router';

import { AnalyticsPage } from './features/analytics/analytics.page';
import { CalendarPage } from './features/calendar/calendar.page';
import { HomePage } from './features/home/home.page';
import { InfraPage } from './features/infra/infra.page';
import { IssueListPage } from './features/issues/issue-list.page';
import { NotesPage } from './features/notes/notes.page';
import { OpenClawPage } from './features/openclaw/openclaw.page';
import { PrsPage } from './features/prs/prs.page';
import { ReposPage } from './features/repos/repos.page';
import { DonePage } from './features/tasks/done.page';
import { TasksPage } from './features/tasks/tasks.page';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    title: 'Command Center Home',
  },
  {
    path: 'issues/urgent',
    component: IssueListPage,
    title: 'Urgent Issues',
    data: {
      priority: 'urgent',
      eyebrow: 'Issues',
      title: 'Urgent Issues',
      subtitle: 'Critical and bug-heavy work that needs the fastest attention.',
    },
  },
  {
    path: 'issues/active',
    component: IssueListPage,
    title: 'Active Issues',
    data: {
      priority: 'active',
      eyebrow: 'Issues',
      title: 'Active Issues',
      subtitle: 'In-progress work and the main queue of issues that are currently active.',
    },
  },
  {
    path: 'issues/backlog',
    component: IssueListPage,
    title: 'Backlog Issues',
    data: {
      priority: 'backlog',
      eyebrow: 'Issues',
      title: 'Backlog Issues',
      subtitle: 'Deferred work and the longer queue waiting behind the current focus.',
    },
  },
  {
    path: 'prs',
    component: PrsPage,
    title: 'Pull Requests',
  },
  {
    path: 'tasks',
    component: TasksPage,
    title: 'Tasks',
  },
  {
    path: 'done',
    component: DonePage,
    title: 'Completed Tasks',
  },
  {
    path: 'notes',
    component: NotesPage,
    title: 'Notes',
  },
  {
    path: 'calendar',
    component: CalendarPage,
    title: 'Calendar',
  },
  {
    path: 'repos',
    component: ReposPage,
    title: 'Repositories',
  },
  {
    path: 'infra',
    component: InfraPage,
    title: 'Infrastructure',
  },
  {
    path: 'openclaw',
    component: OpenClawPage,
    title: 'OpenClaw Runtime',
  },
  {
    path: 'analytics',
    component: AnalyticsPage,
    title: 'Analytics',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
