import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { ViewShellComponent } from '../../layout/view-shell.component';
import { IssuesSummary } from '../../models/api';
import { CommandCenterApiService } from '../../services/api/command-center-api.service';
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
      eyebrow="Issue #69"
      title="Shared shell and primitives are now the rewrite baseline"
      subtitle="This page is intentionally small but real. It proves the reusable shell, cards, badges, state panels, and theme tokens before the larger view migrations start."
      meta="Next up: #70 data layer, then #71 first real feature migration"
    >
      <div view-actions>
        <cc-pill tone="accent">Angular shell</cc-pill>
        <cc-pill tone="info">Tailwind primitives</cc-pill>
      </div>

      <section class="grid gap-4 xl:grid-cols-3">
        <cc-stat-card label="Workspace" value="frontend/" hint="Standalone Angular workspace with shared layout and UI components." tone="accent"></cc-stat-card>
        <cc-stat-card label="Dev flow" value="4200 → 4500" hint="Angular serves locally and proxies API requests to the existing Express backend." tone="success"></cc-stat-card>
        <cc-stat-card label="Cutover" value="#73 later" hint="The legacy frontend remains in place until the Angular migration is complete." tone="warning"></cc-stat-card>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <cc-card
          eyebrow="Shared UI foundation"
          title="What #69 is buying us"
          description="The scaffold is no longer just a one-off page. We now have a reusable frame for headers, navigation, cards, stats, badges, pills, and state handling."
        >
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Componentized layout</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">Header, nav, and route-level page framing now live in shared layout components instead of page-specific markup.</p>
            </div>
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Consistent states</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">Loading, empty, and unavailable experiences can now look coherent across views instead of being rebuilt per page.</p>
            </div>
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Theme support</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">Dark and light mode now come from a shared theme service and token layer instead of view-specific styling.</p>
            </div>
            <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
              <p class="text-sm font-semibold text-[var(--cc-text)]">Safer migrations</p>
              <p class="mt-2 text-sm leading-6 text-[var(--cc-text-muted)]">#71 and #72 can focus on feature composition instead of re-solving spacing, cards, badges, and view chrome.</p>
            </div>
          </div>
        </cc-card>

        <cc-card eyebrow="Live backend check" title="Express API connectivity" tone="muted">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-[var(--cc-text-muted)]">The Angular scaffold is still talking to the current backend through the dev proxy.</p>
            </div>
            <cc-status-badge [tone]="badgeTone()">{{ badgeLabel() }}</cc-status-badge>
          </div>

          @if (loading()) {
            <cc-state-panel
              kind="loading"
              title="Checking API reachability"
              message="Requesting /api/issues through the Angular dev proxy so the shell proves it can sit on top of the existing Express app."
            ></cc-state-panel>
          } @else if (error()) {
            <cc-state-panel
              kind="unavailable"
              title="Backend unavailable"
              [message]="error()!"
            ></cc-state-panel>
          } @else if (summary()) {
            <div class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-3">
                <cc-stat-card label="Open issues" [value]="summary()!.total" hint="Across the tracked GitHub set."></cc-stat-card>
                <cc-stat-card label="Urgent" [value]="summary()!.urgent" hint="High-priority items surfaced by the existing API."></cc-stat-card>
                <cc-stat-card label="Active" [value]="summary()!.active" hint="Items currently in active focus."></cc-stat-card>
              </div>

              <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4 text-sm leading-6 text-[var(--cc-text-muted)]">
                <p><span class="text-[var(--cc-text-soft)]">Source:</span> {{ summary()!.source.label }}</p>
                <p class="mt-2"><span class="text-[var(--cc-text-soft)]">Source state:</span> {{ summary()!.source.status }}</p>
                <p class="mt-2">
                  <span class="text-[var(--cc-text-soft)]">Last update:</span>
                  @if (summary()!.updatedAt) {
                    {{ summary()!.updatedAt! | date:'medium' }}
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
  private readonly api = inject(CommandCenterApiService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly summary = signal<IssuesSummary | null>(null);

  protected readonly badgeLabel = computed(() => {
    if (this.loading()) return 'Loading';
    if (this.error()) return 'Offline';
    return this.summary()?.source.status === 'fresh' ? 'Connected' : this.summary()?.source.status ?? 'Ready';
  });

  protected readonly badgeTone = computed<'neutral' | 'success' | 'warning' | 'danger' | 'info'>(() => {
    if (this.loading()) return 'neutral';
    if (this.error()) return 'danger';

    const status = this.summary()?.source.status;
    if (status === 'fresh') return 'success';
    if (status === 'stale') return 'warning';
    if (status === 'failed') return 'danger';
    if (status === 'refreshing') return 'info';
    return 'neutral';
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
