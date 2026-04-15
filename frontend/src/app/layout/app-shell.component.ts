import { Component, HostListener, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ThemeService } from '../core/theme/theme.service';
import { NavItem } from '../shared/models/nav-item';
import { CommandPaletteComponent } from '../shared/ui/command-palette.component';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CommandPaletteComponent, ThemeToggleComponent],
  template: `
    <div class="min-h-screen cc-app-bg text-[var(--cc-text)]">
      <div class="mx-auto min-h-screen max-w-[1680px] xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-6 xl:px-6 xl:py-6">
        <aside class="cc-shell-sidebar border-b border-[var(--cc-border)] px-4 py-4 sm:px-6 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:rounded-[28px] xl:border xl:px-5 xl:py-5">
          <div>
            @if (theme.theme() === 'dark') {
              <img src="brand/command-center-logo-dark-preview.png" alt="COMMAND CENTER" class="block h-auto w-full object-contain" />
            } @else {
              <img src="brand/command-center-logo-preview.png" alt="COMMAND CENTER" class="block h-auto w-full object-contain" />
            }
          </div>

          <button type="button" class="mt-6 w-full rounded-2xl border border-[var(--cc-border)] bg-white/5 px-4 py-4 text-left text-sm text-[var(--cc-text-muted)] transition hover:border-sky-400/40 hover:text-[var(--cc-text)]" (click)="openPalette()">
            <div class="font-semibold text-[var(--cc-text)]">Open command palette</div>
            <div class="mt-1">Jump to a view, repo, issue, PR, or quick action.</div>
            <div class="mt-3 inline-flex items-center rounded-full border border-[var(--cc-border)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cc-text-soft)]">Ctrl/Cmd + K</div>
          </button>

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

      <cc-command-palette [open]="paletteOpen()" [navItems]="navItems()" (closed)="closePalette()"></cc-command-palette>
    </div>
  `,
})
export class AppShellComponent {
  readonly navItems = input.required<NavItem[]>();
  protected readonly theme = inject(ThemeService);
  protected readonly paletteOpen = signal(false);

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteOpen.set(true);
      return;
    }

    if (event.key === 'Escape' && this.paletteOpen()) {
      event.preventDefault();
      this.closePalette();
    }
  }

  protected openPalette(): void {
    this.paletteOpen.set(true);
  }

  protected closePalette(): void {
    this.paletteOpen.set(false);
  }
}
