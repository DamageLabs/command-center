import { Component, computed, inject } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { STANDARD_PANEL_ACTIONS } from '../../shared/models/panel-action';
import { PanelActionsComponent } from '../../shared/ui/panel-actions.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-openclaw-page',
  imports: [ViewShellComponent, PanelActionsComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="OpenClaw" title="OpenClaw Runtime" subtitle="Gateway reachability, service state, agents, and the local runtime posture without leaving command-center." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-panel-actions [actions]="headerActions" (actionSelected)="onHeaderAction($event)"></cc-panel-actions>
      </div>

      @if (openClaw.isLoading()) {
        <cc-state-panel kind="loading" title="Loading OpenClaw runtime" message="Running local OpenClaw status checks for the dashboard."></cc-state-panel>
      } @else if (openClaw.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="OpenClaw runtime unavailable" [message]="openClaw.error() || 'The local OpenClaw status command failed.'"></cc-state-panel>
      } @else if (!openClaw.data()) {
        <cc-state-panel kind="empty" title="No OpenClaw runtime data" message="No OpenClaw status payload was returned."></cc-state-panel>
      } @else {
        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Gateway</div>
              <cc-pill [tone]="gatewayTone()">{{ gatewayLabel() }}</cc-pill>
            </div>
            <div class="mt-4 text-2xl font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.gateway?.mode || 'unknown' }}</div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ openClaw.data()!.gateway?.url || 'No gateway URL reported' }}</div>
            <div class="mt-4 text-xs text-[var(--cc-text-soft)]">
              @if (openClaw.data()!.gateway?.connectLatencyMs != null) {
                {{ openClaw.data()!.gateway?.connectLatencyMs }} ms probe latency
              } @else {
                probe latency unavailable
              }
            </div>
          </article>

          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Gateway service</div>
              <cc-pill [tone]="serviceTone(openClaw.data()!.gatewayService?.runtime?.status)">{{ openClaw.data()!.gatewayService?.runtime?.status || 'unknown' }}</cc-pill>
            </div>
            <div class="mt-4 text-2xl font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.gatewayService?.label || 'service' }}</div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ openClaw.data()!.gatewayService?.runtimeShort || 'No runtime summary reported' }}</div>
            <div class="mt-4 text-xs text-[var(--cc-text-soft)]">{{ openClaw.data()!.gatewayService?.loadedText || 'unknown load state' }}</div>
          </article>

          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Agents</div>
              <cc-pill tone="info">{{ openClaw.data()!.agents?.agents?.length || 0 }} configured</cc-pill>
            </div>
            <div class="mt-4 text-2xl font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.agents?.totalSessions || 0 }}</div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">recorded sessions</div>
            <div class="mt-4 text-xs text-[var(--cc-text-soft)]">Default agent: {{ openClaw.data()!.agents?.defaultId || '—' }}</div>
          </article>

          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Runtime</div>
              <cc-pill [tone]="openClaw.data()!.memoryPlugin?.enabled ? 'success' : 'warning'">{{ openClaw.data()!.memoryPlugin?.enabled ? 'memory on' : 'memory off' }}</cc-pill>
            </div>
            <div class="mt-4 text-2xl font-semibold text-[var(--cc-text)]">{{ currentVersion() }}</div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ openClaw.data()!.gateway?.self?.host || 'unknown host' }} · {{ openClaw.data()!.gateway?.self?.ip || 'unknown ip' }}</div>
            <div class="mt-4 text-xs text-[var(--cc-text-soft)]">{{ openClaw.data()!.gateway?.self?.platform || 'platform unavailable' }}</div>
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Service details</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Gateway and node services</div>
              </div>
              @if (showUpdateBadge()) {
                <cc-pill tone="warning">Update {{ latestVersion() }}</cc-pill>
              }
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <div class="cc-stat-surface p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-[var(--cc-text)]">Gateway service</div>
                  <cc-pill [tone]="serviceTone(openClaw.data()!.gatewayService?.runtime?.status)">{{ openClaw.data()!.gatewayService?.runtime?.status || 'unknown' }}</cc-pill>
                </div>
                <dl class="mt-4 space-y-2 text-sm text-[var(--cc-text-muted)]">
                  <div class="flex items-center justify-between gap-4"><dt>Manager</dt><dd>{{ openClaw.data()!.gatewayService?.label || '—' }}</dd></div>
                  <div class="flex items-center justify-between gap-4"><dt>Loaded</dt><dd>{{ openClaw.data()!.gatewayService?.loadedText || '—' }}</dd></div>
                  <div class="flex items-center justify-between gap-4"><dt>PID</dt><dd>{{ openClaw.data()!.gatewayService?.runtime?.pid || '—' }}</dd></div>
                  <div class="flex items-center justify-between gap-4"><dt>Last exit</dt><dd>{{ openClaw.data()!.gatewayService?.runtime?.lastExitStatus ?? '—' }}</dd></div>
                </dl>
              </div>

              <div class="cc-stat-surface p-4">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-[var(--cc-text)]">Node service</div>
                  <cc-pill [tone]="serviceTone(openClaw.data()!.nodeService?.runtime?.status)">{{ openClaw.data()!.nodeService?.runtime?.status || 'unknown' }}</cc-pill>
                </div>
                <dl class="mt-4 space-y-2 text-sm text-[var(--cc-text-muted)]">
                  <div class="flex items-center justify-between gap-4"><dt>Installed</dt><dd>{{ openClaw.data()!.nodeService?.installed ? 'Yes' : 'No' }}</dd></div>
                  <div class="flex items-center justify-between gap-4"><dt>Loaded</dt><dd>{{ openClaw.data()!.nodeService?.loadedText || '—' }}</dd></div>
                  <div class="flex items-center justify-between gap-4"><dt>Status</dt><dd>{{ openClaw.data()!.nodeService?.runtimeShort || '—' }}</dd></div>
                  <div class="flex items-center justify-between gap-4"><dt>Managed</dt><dd>{{ openClaw.data()!.nodeService?.managedByOpenClaw ? 'OpenClaw' : 'External / none' }}</dd></div>
                </dl>
              </div>
            </div>
          </article>

          <article class="cc-list-card p-5">
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Operator notes</div>
            <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">At-a-glance posture</div>
            <ul class="mt-5 space-y-3 text-sm text-[var(--cc-text-muted)]">
              <li>Gateway is <span class="font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.gateway?.reachable ? 'reachable' : 'not reachable' }}</span>.</li>
              <li>Memory plugin is <span class="font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.memoryPlugin?.enabled ? 'enabled' : 'disabled' }}</span>{{ openClaw.data()!.memoryPlugin?.slot ? ' via ' + openClaw.data()!.memoryPlugin?.slot : '' }}.</li>
              <li>{{ openClaw.data()!.agents?.bootstrapPendingCount || 0 }} agents are waiting on bootstrap.</li>
              <li>{{ secretStatus() }}</li>
            </ul>
          </article>
        </section>

        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @for (agent of openClaw.data()!.agents?.agents || []; track agent.id) {
            <article class="cc-list-card p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="text-base font-semibold text-[var(--cc-text)]">{{ agent.name }}</div>
                  <div class="mt-2 text-xs text-[var(--cc-text-soft)]">{{ agent.id }} · {{ agent.workspaceDir }}</div>
                </div>
                <cc-pill [tone]="agent.bootstrapPending ? 'warning' : 'success'">{{ agent.bootstrapPending ? 'bootstrap pending' : 'ready' }}</cc-pill>
              </div>
              <dl class="mt-4 space-y-2 text-sm text-[var(--cc-text-muted)]">
                <div class="flex items-center justify-between gap-4"><dt>Sessions</dt><dd>{{ agent.sessionsCount }}</dd></div>
                <div class="flex items-center justify-between gap-4"><dt>Last active</dt><dd>{{ formatAge(agent.lastActiveAgeMs) }}</dd></div>
                <div class="flex items-center justify-between gap-4"><dt>Session index</dt><dd class="truncate text-right">{{ agent.sessionsPath }}</dd></div>
              </dl>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class OpenClawPage {
  private readonly data = inject(DashboardDataService);

  protected readonly openClaw = this.data.openClaw();
  protected readonly headerActions = STANDARD_PANEL_ACTIONS;
  protected readonly currentVersion = computed(() => this.openClaw.data()?.version || this.openClaw.data()?.gateway?.self?.version || 'unknown');
  protected readonly latestVersion = computed(() => this.openClaw.data()?.updateInfo?.latestVersion || 'available');
  protected readonly showUpdateBadge = computed(() => {
    const latest = this.openClaw.data()?.updateInfo?.latestVersion;
    const current = this.currentVersion();
    return Boolean(latest && current && latest !== current);
  });
  protected readonly meta = computed(() => {
    const gateway = this.openClaw.data()?.gateway?.reachable ? 'gateway reachable' : 'gateway down';
    const service = this.openClaw.data()?.gatewayService?.runtime?.status || 'unknown service';
    const sessions = this.openClaw.data()?.agents?.totalSessions || 0;
    return `${gateway} · ${service} · ${sessions} sessions`;
  });

  protected onHeaderAction(actionId: string): void {
    if (actionId === 'refresh') {
      this.openClaw.refresh();
      return;
    }

    if (actionId === 'copy') {
      void this.copyLink();
    }
  }

  protected gatewayTone(): 'success' | 'danger' | 'warning' {
    const gateway = this.openClaw.data()?.gateway;
    if (!gateway) return 'warning';
    if (gateway.reachable) return 'success';
    return gateway.misconfigured ? 'danger' : 'warning';
  }

  protected gatewayLabel(): string {
    const gateway = this.openClaw.data()?.gateway;
    if (!gateway) return 'unknown';
    if (gateway.reachable) return 'reachable';
    if (gateway.misconfigured) return 'misconfigured';
    return 'offline';
  }

  protected serviceTone(status?: string | null): 'success' | 'danger' | 'warning' {
    if (status === 'running') return 'success';
    if (status === 'stopped') return 'warning';
    if (status === 'failed') return 'danger';
    return 'warning';
  }

  protected secretStatus(): string {
    const count = this.openClaw.data()?.secretDiagnostics?.length || 0;
    return count > 0 ? `${count} secret diagnostics need attention.` : 'No secret diagnostics are currently flagged.';
  }

  protected formatAge(ageMs?: number | null): string {
    if (ageMs == null) return '—';
    if (ageMs < 60_000) return `${Math.max(1, Math.round(ageMs / 1000))}s ago`;
    if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m ago`;
    if (ageMs < 86_400_000) return `${Math.round(ageMs / 3_600_000)}h ago`;
    return `${Math.round(ageMs / 86_400_000)}d ago`;
  }

  private async copyLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  }
}
