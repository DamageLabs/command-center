import { Routes } from '@angular/router';

import { HomePage } from './features/home/home.page';
import { PlaceholderPageComponent } from './features/shared/placeholder-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    title: 'Command Center Rewrite Scaffold',
  },
  {
    path: 'issues',
    component: PlaceholderPageComponent,
    title: 'Issues Migration Target',
    data: {
      title: 'Issues migration target',
      description: 'This route establishes where the Angular issue views will land once issue #71 begins. For now it exists to prove the new route shell and feature structure.',
    },
  },
  {
    path: 'notes',
    component: PlaceholderPageComponent,
    title: 'Notes Migration Target',
    data: {
      title: 'Notes migration target',
      description: 'This route marks the future Angular landing zone for Notes, Standup, Calendar, Repos, Infra, and Analytics work tracked in issue #72.',
    },
  },
  {
    path: '**',
    redirectTo: '',
  },
];
