import { Routes } from '@angular/router';

import { HomePage } from './features/home/home.page';
import { IssueListPage } from './features/issues/issue-list.page';
import { PrsPage } from './features/prs/prs.page';
import { PlaceholderPageComponent } from './features/shared/placeholder-page.component';
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
      eyebrow: 'Layer 1',
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
      eyebrow: 'Layer 1',
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
      eyebrow: 'Layer 1',
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
    path: 'calendar',
    component: PlaceholderPageComponent,
    title: 'Calendar Migration Target',
    data: {
      title: 'Calendar migration target',
      description: 'The dedicated Calendar page is still part of issue #72, but the Home dashboard already consumes calendar data through the shared resource layer.',
    },
  },
  {
    path: 'repos',
    component: PlaceholderPageComponent,
    title: 'Repos Migration Target',
    data: {
      title: 'Repository migration target',
      description: 'The dedicated Repositories page remains in issue #72. Home can still surface repo summaries and pinned repo items in the meantime.',
    },
  },
  {
    path: 'infra',
    component: PlaceholderPageComponent,
    title: 'Infra Migration Target',
    data: {
      title: 'Infrastructure migration target',
      description: 'The dedicated Infrastructure page remains in issue #72, but Home can already show a lightweight infra summary from the shared resource layer.',
    },
  },
  {
    path: 'notes',
    component: PlaceholderPageComponent,
    title: 'Notes Migration Target',
    data: {
      title: 'Notes migration target',
      description: 'The dedicated Notes view remains part of issue #72, while Home already uses the shared notes and standup resources.',
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
