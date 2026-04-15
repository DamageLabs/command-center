import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-status-badge',
  template: `
    <span [class]="classes()">
      <ng-content></ng-content>
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly tone = input<'neutral' | 'success' | 'warning' | 'danger' | 'info'>('neutral');

  protected readonly classes = computed(() => {
    const base = 'inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]';
    const tones = {
      neutral: 'border-[var(--cc-border)] bg-white/5 text-[var(--cc-text-soft)]',
      success: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
      warning: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
      danger: 'border-[var(--cc-danger-border)] bg-[var(--cc-danger-surface)] text-[var(--cc-danger-text)]',
      info: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });
}
