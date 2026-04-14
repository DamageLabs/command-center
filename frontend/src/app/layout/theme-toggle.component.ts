import { Component, computed, inject } from '@angular/core';

import { ThemeService } from '../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      (click)="theme.toggleTheme()"
      class="inline-flex items-center gap-3 rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]"
    >
      <span class="text-base">{{ icon() }}</span>
      <span>{{ label() }}</span>
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly icon = computed(() => (this.theme.theme() === 'dark' ? '☾' : '☀'));
  protected readonly label = computed(() => (this.theme.theme() === 'dark' ? 'Dark mode' : 'Light mode'));
}
