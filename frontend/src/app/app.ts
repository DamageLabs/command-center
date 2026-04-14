import { Component } from '@angular/core';

import { AppShellComponent } from './layout/app-shell.component';
import { NavItem } from './shared/models/nav-item';

@Component({
  selector: 'app-root',
  imports: [AppShellComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly navItems: NavItem[] = [
    { path: '/', label: 'Home' },
    { path: '/issues/urgent', label: 'Urgent' },
    { path: '/issues/active', label: 'Active' },
    { path: '/issues/backlog', label: 'Backlog' },
    { path: '/prs', label: 'PRs' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/done', label: 'Done' },
    { path: '/notes', label: 'Notes' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/repos', label: 'Repos' },
    { path: '/infra', label: 'Infra' },
    { path: '/analytics', label: 'Analytics' },
  ];
}
