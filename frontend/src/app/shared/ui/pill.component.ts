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
    const base = 'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]';
    const tones = {
      neutral: 'border-[var(--cc-border)] bg-white/5 text-[var(--cc-text-soft)]',
      accent: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-100',
      success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
      warning: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
      danger: 'border-[var(--cc-danger-border)] bg-[var(--cc-danger-surface)] text-[var(--cc-danger-text)]',
      info: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });
}
