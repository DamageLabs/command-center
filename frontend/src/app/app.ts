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
    { path: '/', label: 'Scaffold Home' },
    { path: '/issues', label: 'Issue Views' },
    { path: '/notes', label: 'Secondary Views' },
  ];
}
