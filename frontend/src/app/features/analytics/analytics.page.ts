import { Component, computed, inject } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-analytics-page',
  imports: [ViewShellComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Pass 2" title="Analytics" subtitle="Angular analytics view with shared resource loading, summary metrics, and site table presentation." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-pill tone="warning">Angular secondary view</cc-pill>
        <button type="button" (click)="analytics.refresh()" class="inline-flex items-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]">Refresh</button>
      </div>

      @if (analytics.isLoading()) {
        <cc-state-panel kind="loading" title="Loading analytics" message="Reading the latest analytics snapshot from Umami through the shared analytics resource."></cc-state-panel>
      } @else if (analytics.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Analytics unavailable" [message]="analytics.error() || 'Analytics data could not be loaded.'"></cc-state-panel>
      } @else if (!analytics.data()?.sites?.length) {
        <cc-state-panel kind="empty" title="No analytics data" message="No analytics site rows were returned for the current range."></cc-state-panel>
      } @else {
        <section class="grid gap-4 md:grid-cols-4">
          <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Page Views</div><div class="mt-3 text-3xl font-semibold text-amber-300">{{ analytics.data()!.totals.pageviews.toLocaleString() }}</div></div>
          <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Unique Visitors</div><div class="mt-3 text-3xl font-semibold text-sky-300">{{ analytics.data()!.totals.visitors.toLocaleString() }}</div></div>
          <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Sessions</div><div class="mt-3 text-3xl font-semibold text-emerald-300">{{ analytics.data()!.totals.visits.toLocaleString() }}</div></div>
          <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Avg Bounce</div><div class="mt-3 text-3xl font-semibold text-fuchsia-300">{{ averageBounce() }}%</div></div>
        </section>

        <section class="overflow-hidden rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)]">
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-[var(--cc-border)] text-left text-[var(--cc-text-soft)]">
                  <th class="px-5 py-4 font-semibold">Property</th>
                  <th class="px-5 py-4 text-right font-semibold">Page Views</th>
                  <th class="px-5 py-4 text-right font-semibold">Visitors</th>
                  <th class="px-5 py-4 text-right font-semibold">Sessions</th>
                  <th class="px-5 py-4 text-right font-semibold">Bounce</th>
                  <th class="px-5 py-4 text-right font-semibold">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                @for (site of analytics.data()!.sites; track site.domain) {
                  <tr class="border-b border-[var(--cc-border)] align-top">
                    <td class="px-5 py-4">
                      <div class="font-semibold text-[var(--cc-text)]">{{ site.name }}</div>
                      <a [href]="'https://' + site.domain" target="_blank" class="mt-1 inline-flex text-xs text-[var(--cc-text-soft)]">{{ site.domain }}</a>
                      <div class="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-[var(--cc-surface-muted)]">
                        <div class="h-full rounded-full bg-amber-300" [style.width.%]="shareOfPageviews(site.pageviews)"></div>
                      </div>
                    </td>
                    <td class="px-5 py-4 text-right font-semibold text-amber-300">{{ site.pageviews.toLocaleString() }}</td>
                    <td class="px-5 py-4 text-right text-sky-300">{{ site.visitors.toLocaleString() }}</td>
                    <td class="px-5 py-4 text-right text-[var(--cc-text)]">{{ site.visits.toLocaleString() }}</td>
                    <td class="px-5 py-4 text-right" [class.text-rose-300]="siteBounce(site) > 70" [class.text-amber-300]="siteBounce(site) > 50 && siteBounce(site) <= 70" [class.text-emerald-300]="siteBounce(site) <= 50">{{ siteBounce(site) }}%</td>
                    <td class="px-5 py-4 text-right text-[var(--cc-text-soft)]">{{ averageDuration(site.totaltime, site.visits) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </app-view-shell>
  `,
})
export class AnalyticsPage {
  private readonly data = inject(DashboardDataService);

  protected readonly analytics = this.data.analytics();
  protected readonly averageBounce = computed(() => {
    const totals = this.analytics.data()?.totals;
    if (!totals || totals.visits === 0) return 0;
    return Math.round((totals.bounces / totals.visits) * 100);
  });
  protected readonly meta = computed(() => {
    const count = this.analytics.data()?.sites.length ?? 0;
    const summary = `Last 30 days · ${count} properties`;
    return this.analytics.source()?.status ? `${summary} · ${this.analytics.source()!.status}` : summary;
  });

  protected shareOfPageviews(pageviews: number): number {
    const total = this.analytics.data()?.totals.pageviews ?? 0;
    if (!total) return 0;
    return Math.round((pageviews / total) * 100);
  }

  protected siteBounce(site: { bounces: number; visits: number }): number {
    if (!site.visits) return 0;
    return Math.round((site.bounces / site.visits) * 100);
  }

  protected averageDuration(totalTime: number, visits: number): string {
    if (!visits) return '0s';
    const seconds = Math.round(totalTime / visits);
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
