import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-stat-card',
  template: `
    <article [class]="classes()">
      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cc-text-soft)]">{{ label() }}</p>
      <p class="mt-3 text-4xl font-semibold tracking-tight text-[var(--cc-text)]">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">{{ hint() }}</p>
      }
    </article>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input('');
  readonly tone = input<'default' | 'accent' | 'success' | 'warning'>('default');

  protected readonly classes = computed(() => {
    const base = 'rounded-[24px] p-5';
    const tones = {
      default: 'cc-panel-muted',
      accent: 'border border-indigo-400/20 bg-indigo-500/10 shadow-[0_18px_40px_rgba(79,70,229,0.14)]',
      success: 'border border-emerald-400/20 bg-emerald-500/10 shadow-[0_18px_40px_rgba(5,150,105,0.14)]',
      warning: 'border border-amber-400/20 bg-amber-500/10 shadow-[0_18px_40px_rgba(217,119,6,0.14)]',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });
}
