import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { CommandCenterApiService } from '../../services/api/command-center-api.service';
import { IssuesSummary } from '../../models/api';

@Component({
  selector: 'app-home-page',
  imports: [DatePipe, NgClass],
  template: `
    <section class="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
      <article class="rounded-3xl border border-white/10 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/30">
        <p class="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/90">Issue #68 scaffold</p>
        <h1 class="mt-4 text-4xl font-semibold tracking-tight text-white">Angular + Tailwind foundation for command.center</h1>
        <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          This is the safe rewrite shell. The existing Express backend still owns the real data and local deployment,
          while Angular now has a dedicated frontend workspace, route shell, Tailwind styling, and an API proxy path.
        </p>

        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <div class="rounded-2xl border border-white/8 bg-slate-950/70 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300/90">Workspace</p>
            <p class="mt-3 text-lg font-semibold text-white">frontend/</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">Standalone Angular app with a future-friendly folder structure for features, shared UI, services, and models.</p>
          </div>
          <div class="rounded-2xl border border-white/8 bg-slate-950/70 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300/90">Dev flow</p>
            <p class="mt-3 text-lg font-semibold text-white">4200 → 4500</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">Angular serves on port 4200 and proxies <code class="rounded bg-white/5 px-1.5 py-0.5 text-slate-200">/api</code> to the existing Express backend on 4500.</p>
          </div>
          <div class="rounded-2xl border border-white/8 bg-slate-950/70 p-5">
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-300/90">Cutover</p>
            <p class="mt-3 text-lg font-semibold text-white">Later issue</p>
            <p class="mt-2 text-sm leading-6 text-slate-400">The legacy static frontend stays in place for now. Final dist serving and production cutover are intentionally deferred to issue #73.</p>
          </div>
        </div>
      </article>

      <article class="rounded-3xl border border-white/10 bg-slate-950/85 p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/90">Live backend check</p>
            <h2 class="mt-3 text-xl font-semibold text-white">Express API connectivity</h2>
          </div>
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
            [ngClass]="badgeClasses()">
            {{ badgeLabel() }}
          </span>
        </div>

        @if (loading()) {
          <div class="mt-6 rounded-2xl border border-white/8 bg-slate-900/70 p-5 text-sm text-slate-300">
            Checking <code class="rounded bg-white/5 px-1.5 py-0.5 text-slate-100">/api/issues</code> through the Angular dev server proxy…
          </div>
        } @else if (error()) {
          <div class="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm leading-6 text-rose-100">
            <p class="font-medium">The Angular app could not reach the existing backend.</p>
            <p class="mt-2 text-rose-100/80">{{ error() }}</p>
          </div>
        } @else if (summary()) {
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/8 bg-slate-900/70 p-5">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Open issues</p>
              <p class="mt-3 text-4xl font-semibold tracking-tight text-white">{{ summary()!.total }}</p>
              <div class="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                <div><span class="block text-rose-300">Urgent</span>{{ summary()!.urgent }}</div>
                <div><span class="block text-amber-300">Active</span>{{ summary()!.active }}</div>
                <div><span class="block text-slate-300">Backlog</span>{{ summary()!.deferred }}</div>
              </div>
            </div>
            <div class="rounded-2xl border border-white/8 bg-slate-900/70 p-5 text-sm leading-6 text-slate-300">
              <p><span class="text-slate-500">Source:</span> {{ summary()!.source.label }}</p>
              <p class="mt-2"><span class="text-slate-500">Source state:</span> {{ summary()!.source.status }}</p>
              <p class="mt-2"><span class="text-slate-500">Last update:</span>
                @if (summary()!.updatedAt) {
                  {{ summary()!.updatedAt! | date:'medium' }}
                } @else {
                  Never
                }
              </p>
            </div>
          </div>
        }
      </article>
    </section>
  `,
})
export class HomePage {
  private readonly api = inject(CommandCenterApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<IssuesSummary | null>(null);

  protected readonly badgeLabel = computed(() => {
    if (this.loading()) return 'Loading';
    if (this.error()) return 'Offline';
    return this.summary()?.source.status === 'fresh' ? 'Connected' : this.summary()?.source.status ?? 'Ready';
  });

  protected readonly badgeClasses = computed(() => {
    if (this.loading()) return 'border border-slate-500/30 bg-slate-500/10 text-slate-200';
    if (this.error()) return 'border border-rose-400/30 bg-rose-400/10 text-rose-200';
    return 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  });

  constructor() {
    this.api.getIssuesSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown API error';
        this.error.set(message);
        this.loading.set(false);
      },
    });
  }
}
