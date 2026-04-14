import { Component, computed, inject } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-infra-page',
  imports: [ViewShellComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Infrastructure" title="Infrastructure" subtitle="Process status, uptime, restarts, and degraded-state handling." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button type="button" (click)="infra.refresh()" class="cc-action-button">Refresh</button>
      </div>

      @if (infra.isLoading()) {
        <cc-state-panel kind="loading" title="Loading infrastructure" message="Reading PM2 process status and runtime metrics for the Infra view."></cc-state-panel>
      } @else if (infra.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Process monitoring unavailable" [message]="infra.error() || 'The rest of command-center is still working, but the Infra source failed.'"></cc-state-panel>
      } @else if (!infra.data()?.length) {
        <cc-state-panel kind="empty" title="No process data" message="No infrastructure processes were returned for the current environment."></cc-state-panel>
      } @else {
        <section class="grid gap-4 md:grid-cols-4">
          <div class="cc-list-card p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Total</div><div class="mt-3 text-3xl font-semibold text-[var(--cc-text)]">{{ infra.data()!.length }}</div></div>
          <div class="cc-list-card p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Online</div><div class="mt-3 text-3xl font-semibold text-emerald-300">{{ onlineCount() }}</div></div>
          <div class="cc-list-card p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Down</div><div class="mt-3 text-3xl font-semibold text-rose-300">{{ downCount() }}</div></div>
          <div class="cc-list-card p-5"><div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Restarts</div><div class="mt-3 text-3xl font-semibold text-amber-300">{{ restartCount() }}</div></div>
        </section>

        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @for (process of infra.data()!; track process.name + ':' + process.id) {
            <article class="cc-list-card p-5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-base font-semibold text-[var(--cc-text)]">{{ process.name }}</div>
                  <div class="mt-2 text-xs text-[var(--cc-text-soft)]">#{{ process.id }} · PID {{ process.pid || '—' }}</div>
                </div>
                <cc-pill [tone]="process.status === 'online' ? 'success' : process.status === 'erroring' ? 'danger' : 'warning'">{{ process.status }}</cc-pill>
              </div>

              <div class="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div class="cc-stat-tile"><div class="text-[var(--cc-text-soft)]">Uptime</div><div class="mt-1 font-semibold text-[var(--cc-text)]">{{ formatUptime(process.uptime) }}</div></div>
                <div class="cc-stat-tile"><div class="text-[var(--cc-text-soft)]">Memory</div><div class="mt-1 font-semibold text-[var(--cc-text)]">{{ formatMemory(process.memory) }}</div></div>
                <div class="cc-stat-tile"><div class="text-[var(--cc-text-soft)]">Restarts</div><div class="mt-1 font-semibold text-[var(--cc-text)]">{{ process.restarts }}</div></div>
              </div>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class InfraPage {
  private readonly data = inject(DashboardDataService);

  protected readonly infra = this.data.infra();
  protected readonly onlineCount = computed(() => (this.infra.data() ?? []).filter((process) => process.status === 'online').length);
  protected readonly downCount = computed(() => (this.infra.data() ?? []).filter((process) => process.status !== 'online').length);
  protected readonly restartCount = computed(() => (this.infra.data() ?? []).reduce((sum, process) => sum + (process.restarts || 0), 0));
  protected readonly meta = computed(() => {
    const summary = `${this.onlineCount()} online · ${this.downCount()} down · ${this.restartCount()} restarts`;
    return this.infra.source()?.status ? `${summary} · ${this.infra.source()!.status}` : summary;
  });

  protected formatUptime(ms: number | null): string {
    if (!ms) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  protected formatMemory(bytes: number): string {
    return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '0 MB';
  }
}
