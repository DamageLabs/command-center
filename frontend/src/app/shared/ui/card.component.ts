import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-card',
  template: `
    <article [class]="classes()">
      @if (eyebrow() || title() || description()) {
        <header>
          @if (eyebrow()) {
            <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-soft)]">{{ eyebrow() }}</p>
          }
          @if (title()) {
            <h2 class="mt-3 text-[1.6rem] font-semibold tracking-tight text-[var(--cc-text)]">{{ title() }}</h2>
          }
          @if (description()) {
            <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--cc-text-muted)]">{{ description() }}</p>
          }
        </header>
      }

      <div [class]="bodyClasses()">
        <ng-content></ng-content>
      </div>
    </article>
  `,
})
export class CardComponent {
  readonly eyebrow = input('');
  readonly title = input('');
  readonly description = input('');
  readonly tone = input<'default' | 'muted' | 'highlight'>('default');
  readonly compact = input(false);

  protected readonly classes = computed(() => {
    const base = 'rounded-[28px] p-6 md:p-7';
    const tones = {
      default: 'cc-panel',
      muted: 'cc-panel-muted',
      highlight: 'cc-panel-highlight',
    } as const;

    return `${base} ${tones[this.tone()]}`;
  });

  protected readonly bodyClasses = computed(() => (this.compact() ? 'mt-5' : 'mt-6'));
}
