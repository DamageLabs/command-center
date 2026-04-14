import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-state-panel',
  template: `
    <section [class]="classes()">
      <div class="flex items-start gap-4">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 text-base text-[var(--cc-text)]" [class]="iconWrapClasses()">
          {{ icon() }}
        </div>
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
    const base = 'rounded-[24px] p-5';
    const tones = {
      loading: 'cc-panel-muted',
      empty: 'cc-panel-soft',
      unavailable: 'border border-rose-400/20 bg-rose-400/10 shadow-[0_18px_40px_rgba(159,18,57,0.18)]',
    } as const;

    return `${base} ${tones[this.kind()]}`;
  });

  protected readonly iconWrapClasses = computed(() => {
    const tones = {
      loading: 'bg-white/5',
      empty: 'bg-white/5',
      unavailable: 'bg-rose-500/15 text-rose-100',
    } as const;

    return tones[this.kind()];
  });
}
