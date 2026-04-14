import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-pill',
  template: `
    <span [class]="classes()">
      <ng-content></ng-content>
    </span>
  `,
})
export class PillComponent {
  readonly tone = input<'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'>('neutral');

  protected readonly classes = computed(() => {
    const base = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]';
    const tones = {
      neutral: 'border-[var(--cc-border)] bg-[var(--cc-surface-muted)] text-[var(--cc-text-soft)]',
      accent: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
      success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
      warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
      danger: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
      info: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });
}
