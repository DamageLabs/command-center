import { Component, computed, inject } from '@angular/core';

import { ThemeService } from '../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  template: `
    <button type="button" (click)="theme.toggleTheme()" class="cc-action-button w-full justify-center xl:justify-between">
      <span class="inline-flex items-center gap-3">
        <span class="text-base">{{ icon() }}</span>
        <span>{{ label() }}</span>
      </span>
    </button>
  `,
})
export class ThemeToggleComponent {
  protected readonly theme = inject(ThemeService);

  protected readonly icon = computed(() => (this.theme.theme() === 'dark' ? '☾' : '☀'));
  protected readonly label = computed(() => (this.theme.theme() === 'dark' ? 'Dark mode' : 'Light mode'));
}
