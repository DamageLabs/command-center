import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { CardComponent } from '../../shared/ui/card.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';
import { StatCardComponent } from '../../shared/ui/stat-card.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge.component';

@Component({
  selector: 'app-home-page',
  imports: [
    DatePipe,
    ViewShellComponent,
    CardComponent,
    PillComponent,
    StatePanelComponent,
    StatCardComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-view-shell
      eyebrow="Issue #70"
      title="Angular now has a shared data layer"
      subtitle="Polling, refresh behavior, freshness metadata, and degraded-state handling are now centralized so future Angular views can compose data instead of hand-rolling fetch logic."
      meta="Next up: #71 first real feature migration onto the shell and data layer"
    >
      <div view-actions>
        <cc-pill tone="accent">Shared resources</cc-pill>
        <cc-pill tone="info">Polling + freshness</cc-pill>
        <button
          type="button"
          (click)="refreshAll()"
          [disabled]="refreshingAll()"
          class="inline-flex items-center gap-2 rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ refreshingAll() ? 'Refreshing…' : 'Refresh sources' }}
        </button>
      </div>

      <section class="grid gap-4 xl:grid-cols-3">
        <cc-stat-card label="API layer" value="9 endpoints" hint="Typed accessors exist for issues, repos, calendar, infra, tasks, PRs, standup, analytics, and notes." tone="accent"></cc-stat-card>
        <cc-stat-card label="Refresh model" value="Centralized" hint="Polling and manual refresh live in one place instead of scattered across pages." tone="success"></cc-stat-card>
        <cc-stat-card label="Next migration" value="#71" hint="Home, Issues, PRs, and Tasks can now consume shared resources instead of local HttpClient logic." tone="warning"></cc-stat-card>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <cc-card
          eyebrow="Data layer overview"
          title="What #70 adds"
          description="The frontend now has a shared data service that wraps the existing Express endpoints, normalizes source metadata, and defines one polling/refresh path for the rewrite."
        >
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Typed API access</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">All current backend endpoints now have Angular accessors instead of ad hoc page-level requests.</p>
            </div>
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Polled resources</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">Each source uses a shared resource model with loading, refreshing, empty, ready, and unavailable handling.</p>
            </div>
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Freshness-aware UI</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">Backend source metadata now drives consistent stale, refreshing, and failed-state badges in the Angular shell.</p>
            </div>
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Central refresh</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">Manual refresh now has one home, which will make upcoming feature views much cleaner.</p>
            </div>
          </div>
        </cc-card>

        <cc-card eyebrow="Live resource proof" title="Issues resource from shared data layer" tone="muted">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-[var(--cc-text-muted)]">This panel is now powered by the shared resource layer rather than page-local HttpClient subscriptions.</p>
            </div>
            <cc-status-badge [tone]="badgeTone()">{{ badgeLabel() }}</cc-status-badge>
          </div>

          @if (issues.isLoading()) {
            <cc-state-panel
              kind="loading"
              title="Loading issues resource"
              message="The shared Angular data layer is fetching /api/issues and normalizing the source metadata for the UI."
            ></cc-state-panel>
          } @else if (issues.isUnavailable()) {
            <cc-state-panel
              kind="unavailable"
              title="Issues resource unavailable"
              [message]="issues.error() || 'The backend could not return issue data.'"
            ></cc-state-panel>
          } @else if (issues.isEmpty()) {
            <cc-state-panel
              kind="empty"
              title="No issues returned"
              message="The shared issues resource is healthy, but the current payload is empty."
            ></cc-state-panel>
          } @else if (issues.data()) {
            <div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-3">
                <cc-stat-card label="Open issues" [value]="issues.data()!.total" hint="Across the tracked GitHub set."></cc-stat-card>
                <cc-stat-card label="Urgent" [value]="issues.data()!.counts.urgent" hint="High-priority items surfaced by the backend."></cc-stat-card>
                <cc-stat-card label="Active" [value]="issues.data()!.counts.active" hint="Currently active items from the shared issues resource."></cc-stat-card>
              </div>

              <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4 text-sm leading-6 text-[var(--cc-text-muted)]">
                <p><span class="text-[var(--cc-text-soft)]">Source:</span> {{ issues.source()?.label }}</p>
                <p class="mt-2"><span class="text-[var(--cc-text-soft)]">Source state:</span> {{ issues.source()?.status }}</p>
                <p class="mt-2"><span class="text-[var(--cc-text-soft)]">Resource state:</span> {{ issues.state().stage }}</p>
                <p class="mt-2">
                  <span class="text-[var(--cc-text-soft)]">Last update:</span>
                  @if (issues.data()!.updatedAt) {
                    {{ issues.data()!.updatedAt! | date:'medium' }}
                  } @else {
                    Never
                  }
                </p>
              </div>
            </div>
          }
        </cc-card>
      </section>
    </app-view-shell>
  `,
})
export class HomePage {
  private readonly data = inject(DashboardDataService);

  protected readonly issues = this.data.issues();
  protected readonly refreshingAll = this.data.refreshingAll;

  protected readonly badgeLabel = computed(() => {
    if (this.issues.isLoading()) return 'Loading';
    if (this.issues.isRefreshing()) return 'Refreshing';
    if (this.issues.isUnavailable()) return 'Unavailable';

    const status = this.issues.source()?.status;
    return status === 'fresh' ? 'Connected' : status ?? 'Ready';
  });

  protected readonly badgeTone = computed<'neutral' | 'success' | 'warning' | 'danger' | 'info'>(() => {
    if (this.issues.isLoading()) return 'neutral';
    if (this.issues.isRefreshing()) return 'info';
    if (this.issues.isUnavailable()) return 'danger';

    const status = this.issues.source()?.status;
    if (status === 'fresh') return 'success';
    if (status === 'stale') return 'warning';
    if (status === 'failed') return 'danger';
    if (status === 'refreshing') return 'info';
    return 'neutral';
  });

  protected refreshAll(): void {
    this.data.refreshAll();
  }
}
