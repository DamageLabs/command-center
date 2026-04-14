import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-placeholder-page',
  imports: [RouterLink],
  template: `
    <section class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <article class="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/90">Angular migration target</p>
        <h1 class="mt-4 text-3xl font-semibold tracking-tight text-white">{{ title }}</h1>
        <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
          {{ description }}
        </p>
      </article>

      <article class="rounded-3xl border border-white/10 bg-slate-950/80 p-6">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/90">Why this exists</p>
        <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <li>• gives the Angular shell real route targets early</li>
          <li>• keeps the rewrite incremental instead of one giant cutover</li>
          <li>• makes it obvious where each future issue should land</li>
        </ul>
        <a routerLink="/" class="mt-6 inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-300/15">
          Back to scaffold overview
        </a>
      </article>
    </section>
  `,
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly description = this.route.snapshot.data['description'] as string;
}
