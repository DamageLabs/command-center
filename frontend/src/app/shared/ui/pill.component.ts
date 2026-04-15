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
      accent: 'border-[var(--cc-accent-border)] bg-[var(--cc-accent-surface)] text-[var(--cc-accent-text)]',
      success: 'border-[var(--cc-success-border)] bg-[var(--cc-success-surface)] text-[var(--cc-success-text)]',
      warning: 'border-[var(--cc-warning-border)] bg-[var(--cc-warning-surface)] text-[var(--cc-warning-text)]',
      danger: 'border-[var(--cc-danger-border)] bg-[var(--cc-danger-surface)] text-[var(--cc-danger-text)]',
      info: 'border-[var(--cc-info-border)] bg-[var(--cc-info-surface)] text-[var(--cc-info-text)]',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });
}
