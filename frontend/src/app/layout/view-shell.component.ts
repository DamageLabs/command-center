import { Component, input } from '@angular/core';

@Component({
  selector: 'app-view-shell',
  template: `
    <section class="space-y-6">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          @if (eyebrow()) {
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--cc-text-soft)]">{{ eyebrow() }}</p>
          }
          <h1 class="mt-3 text-3xl font-semibold tracking-tight text-[var(--cc-text)] sm:text-4xl">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--cc-text-muted)]">{{ subtitle() }}</p>
          }
          @if (meta()) {
            <p class="mt-3 text-xs font-medium uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">{{ meta() }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <ng-content select="[view-actions]"></ng-content>
        </div>
      </header>

      <div class="space-y-6">
        <ng-content></ng-content>
      </div>
    </section>
  `,
})
export class ViewShellComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly meta = input('');
}
