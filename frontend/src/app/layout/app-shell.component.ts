import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NavItem } from '../shared/models/nav-item';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ThemeToggleComponent],
  template: `
    <div class="min-h-screen cc-app-bg text-[var(--cc-text)]">
      <div class="mx-auto min-h-screen max-w-[1680px] xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-6 xl:px-6 xl:py-6">
        <aside class="cc-shell-sidebar border-b border-[var(--cc-border)] px-4 py-4 sm:px-6 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:rounded-[28px] xl:border xl:px-5 xl:py-5">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-indigo-500/20">
              C
            </div>
            <div class="min-w-0">
              <div class="truncate text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-soft)]">command.center</div>
              <div class="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--cc-text)]">Operations cockpit</div>
            </div>
          </div>

          <div class="mt-6 rounded-2xl border border-[var(--cc-border)] bg-white/5 px-4 py-4 text-sm text-[var(--cc-text-muted)]">
            GitHub, notes, tasks, calendar, analytics, and runtime status in one place.
          </div>

          <nav class="mt-6 flex flex-wrap gap-2 xl:flex-col">
            @for (item of navItems(); track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="cc-shell-nav-link-active"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                class="cc-shell-nav-link"
              >
                <span class="h-2.5 w-2.5 rounded-full bg-current opacity-55"></span>
                <span>{{ item.label }}</span>
              </a>
            }
          </nav>

          <div class="mt-6 xl:mt-auto">
            <app-theme-toggle></app-theme-toggle>
          </div>
        </aside>

        <main class="min-w-0 px-4 py-5 sm:px-6 lg:px-8 xl:px-0 xl:py-0">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  readonly navItems = input.required<NavItem[]>();
}
