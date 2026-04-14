import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-stat-card',
  template: `
    <article [class]="classes()">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">{{ label() }}</p>
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
    const base = 'rounded-2xl border p-5';
    const tones = {
      default: 'cc-panel-muted',
      accent: 'border-sky-400/20 bg-sky-400/10',
      success: 'border-emerald-400/20 bg-emerald-400/10',
      warning: 'border-amber-400/20 bg-amber-400/10',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });
}
