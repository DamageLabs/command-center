import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NavItem } from '../shared/models/nav-item';
import { PillComponent } from '../shared/ui/pill.component';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, PillComponent, ThemeToggleComponent],
  template: `
    <div class="min-h-screen cc-app-bg text-[var(--cc-text)]">
      <header class="border-b border-[var(--cc-border)] bg-[var(--cc-header)]/95 backdrop-blur">
        <div class="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:px-8">
          <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--cc-text-soft)]">command.center rewrite</p>
              <h1 class="mt-3 text-3xl font-semibold tracking-tight text-[var(--cc-text)] sm:text-4xl">Angular daily-use views are live</h1>
              <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--cc-text-muted)]">
                The rewrite now includes real Angular versions of Home, Issues, PRs, Tasks, and Done, backed by the shared shell, data layer, and interaction state services.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <cc-pill tone="accent">Issue #71</cc-pill>
              <cc-pill>Daily-use Angular views</cc-pill>
              <app-theme-toggle></app-theme-toggle>
            </div>
          </div>

          <nav class="flex flex-wrap gap-3">
            @for (item of navItems(); track item.path) {
              <a
                [routerLink]="item.path"
                routerLinkActive="border-amber-300/40 bg-amber-300/15 text-[var(--cc-text)]"
                [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                class="rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-white/15 hover:text-[var(--cc-text)]"
              >
                {{ item.label }}
              </a>
            }
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class AppShellComponent {
  readonly navItems = input.required<NavItem[]>();
}
