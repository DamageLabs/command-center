import { Component, input } from '@angular/core';

@Component({
  selector: 'app-view-shell',
  template: `
    <section class="space-y-6">
      <header class="cc-panel rounded-[28px] px-6 py-6 md:px-8 md:py-7">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            @if (eyebrow()) {
              <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--cc-text-soft)]">{{ eyebrow() }}</p>
            }
            <h1 class="mt-3 text-3xl font-semibold tracking-tight text-[var(--cc-text)] sm:text-[2.5rem]">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--cc-text-muted)]">{{ subtitle() }}</p>
            }
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <ng-content select="[view-actions]"></ng-content>
          </div>
        </div>

        @if (meta()) {
          <div class="mt-5 inline-flex rounded-full border border-[var(--cc-border)] bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cc-text-soft)]">
            {{ meta() }}
          </div>
        }
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
