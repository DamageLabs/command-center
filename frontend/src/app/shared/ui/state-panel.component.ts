import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-state-panel',
  template: `
    <section [class]="classes()">
      <div class="flex items-start gap-4">
        <div class="mt-0.5 text-lg">{{ icon() }}</div>
        <div>
          <p class="text-sm font-semibold text-[var(--cc-text)]">{{ title() }}</p>
          <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">{{ message() }}</p>
        </div>
      </div>
    </section>
  `,
})
export class StatePanelComponent {
  readonly kind = input<'loading' | 'empty' | 'unavailable'>('loading');
  readonly title = input.required<string>();
  readonly message = input.required<string>();

  protected readonly icon = computed(() => {
    const icons = {
      loading: '◌',
      empty: '○',
      unavailable: '⚠',
    } as const;

    return icons[this.kind()];
  });

  protected readonly classes = computed(() => {
    const base = 'rounded-2xl border p-5';
    const tones = {
      loading: 'border-[var(--cc-border)] bg-[var(--cc-surface-muted)]',
      empty: 'border-[var(--cc-border)] bg-[var(--cc-surface-muted)]',
      unavailable: 'border-rose-400/20 bg-rose-400/10',
    } as const;

    return `${base} ${tones[this.kind()]}`;
  });
}
