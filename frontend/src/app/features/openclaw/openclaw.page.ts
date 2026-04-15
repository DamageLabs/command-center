import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import type { OpenClawUsageDay, OpenClawUsageModel, OpenClawUsageWindow, OpenClawUsageWindowKey } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { STANDARD_PANEL_ACTIONS } from '../../shared/models/panel-action';
import { PanelActionsComponent } from '../../shared/ui/panel-actions.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';
import { TrendBarsComponent } from '../../shared/ui/trend-bars.component';

@Component({
  selector: 'app-openclaw-page',
  imports: [ViewShellComponent, PanelActionsComponent, PillComponent, StatePanelComponent, TrendBarsComponent],
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
            <div class="mt-4 text-xs text-[var(--cc-text-soft)]">
              {{ openClaw.data()!.gatewayProcess?.elapsed || 'uptime unavailable' }} · {{ formatMemory(openClaw.data()!.gatewayProcess?.memoryBytes) }}
            </div>
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
              <li>{{ taskStatus() }}</li>
              <li>{{ secretStatus() }}</li>
            </ul>
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <article class="cc-list-card p-5">
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Channel summary</div>
            <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Configured surfaces</div>
            <div class="mt-5 space-y-3">
              @for (line of openClaw.data()!.channelSummary || []; track line) {
                <div class="cc-stat-surface p-4 text-sm text-[var(--cc-text-muted)]">{{ line }}</div>
              }
            </div>
          </article>

          <article class="cc-list-card p-5">
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Task health</div>
            <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Recent runtime jobs</div>
            <div class="mt-5 grid grid-cols-2 gap-4">
              <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Total</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.tasks?.total || 0 }}</div></div>
              <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Failures</div><div class="mt-2 text-2xl font-semibold text-rose-300">{{ openClaw.data()!.tasks?.failures || 0 }}</div></div>
              <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Warnings</div><div class="mt-2 text-2xl font-semibold text-amber-300">{{ openClaw.data()!.taskAudit?.warnings || 0 }}</div></div>
              <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Errors</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ openClaw.data()!.taskAudit?.errors || 0 }}</div></div>
            </div>
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article class="cc-list-card p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Token and cost analytics</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Model usage over time</div>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (window of usageWindowOptions; track window.key) {
                  <button type="button" (click)="selectUsageWindow(window.key)" class="cc-small-button rounded-full px-3 py-1.5 text-xs" [class.cc-small-button-accent]="selectedUsageWindow() === window.key">
                    {{ window.label }}
                  </button>
                }
              </div>
            </div>

            @if (!openClaw.data()!.usageAnalytics.usageEvents) {
              <cc-state-panel class="mt-5" kind="empty" title="No OpenClaw usage data yet" message="Assistant token and cost analytics will appear here once OpenClaw records usage-bearing responses."></cc-state-panel>
            } @else if (!selectedUsageWindowData() || !selectedUsageWindowData()!.calls) {
              <cc-state-panel class="mt-5" kind="empty" title="No usage in this window" message="Try another time range to see recorded token and cost activity."></cc-state-panel>
            } @else {
              <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Spend</div><div class="mt-2 text-2xl font-semibold text-emerald-300">{{ formatCost(selectedUsageWindowData()!.totalCostUsd) }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">{{ usageCoverageText() }}</div></div>
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Input</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ formatTokenCount(selectedUsageWindowData()!.inputTokens) }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">prompt tokens</div></div>
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Output</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ formatTokenCount(selectedUsageWindowData()!.outputTokens) }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">completion tokens</div></div>
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Cache read</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ formatTokenCount(selectedUsageWindowData()!.cacheReadTokens) }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">reused tokens</div></div>
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Cache write</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ formatTokenCount(selectedUsageWindowData()!.cacheWriteTokens) }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">new cache tokens</div></div>
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Total tokens</div><div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ formatTokenCount(selectedUsageWindowData()!.totalTokens) }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">all assistant calls</div></div>
                <div class="cc-stat-surface p-4"><div class="text-xs uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Top model</div><div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">{{ usageTopModel() }}</div><div class="mt-2 text-xs text-[var(--cc-text-soft)]">{{ selectedUsageWindowData()!.calls }} assistant calls</div></div>
              </div>

              <div class="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--cc-text-soft)]">
                <div>{{ usageFootnote() }}</div>
                <cc-pill [tone]="selectedUsageWindowData()!.costAvailableCalls === selectedUsageWindowData()!.calls ? 'success' : 'warning'">{{ selectedUsageWindowData()!.costAvailableCalls }}/{{ selectedUsageWindowData()!.calls }} costed</cc-pill>
              </div>

              <div class="mt-5 space-y-3">
                @for (model of selectedUsageModels(); track model.model) {
                  <div class="cc-stat-surface p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-[var(--cc-text)]">{{ model.model }}</div>
                        <div class="mt-2 text-xs text-[var(--cc-text-soft)]">Last seen {{ formatAgeFromTimestamp(model.lastSeenAt) }}</div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <cc-pill tone="info">{{ model.calls }} calls</cc-pill>
                        <cc-pill [tone]="model.costAvailableCalls ? 'success' : 'warning'">{{ formatCost(model.totalCostUsd) }}</cc-pill>
                        <cc-pill [tone]="modelUsageShareTone(model)">{{ modelUsageShareLabel(model) }}</cc-pill>
                      </div>
                    </div>
                    <dl class="mt-4 grid gap-3 text-sm text-[var(--cc-text-muted)] md:grid-cols-3 xl:grid-cols-6">
                      <div><dt class="text-[var(--cc-text-soft)]">Input</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(model.inputTokens) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Output</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(model.outputTokens) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Cache read</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(model.cacheReadTokens) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Cache write</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(model.cacheWriteTokens) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Total</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(model.totalTokens) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Spend</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatCost(model.totalCostUsd) }}</dd></div>
                    </dl>
                  </div>
                }
              </div>
            }
          </article>

          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Spend trend</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Daily usage shape</div>
              </div>
              <cc-pill tone="info">{{ selectedUsageWindowData()?.daily?.length || 0 }} days</cc-pill>
            </div>

            @if (!selectedUsageWindowData() || !selectedUsageWindowData()!.daily.length) {
              <cc-state-panel class="mt-5" kind="empty" title="No daily usage trend" message="Daily model spend and token activity will show up here for the selected window."></cc-state-panel>
            } @else {
              <div class="cc-stat-surface mt-5 p-4">
                <div class="text-sm font-semibold text-[var(--cc-text)]">Daily spend</div>
                <div class="mt-3 flex items-end gap-4">
                  <cc-trend-bars class="flex-1" [values]="selectedUsageCostTrend()" tone="emerald" [compact]="false"></cc-trend-bars>
                  <div class="max-w-40 text-xs leading-5 text-[var(--cc-text-soft)]">{{ usageCoverageText() }}</div>
                </div>
              </div>

              <div class="mt-4 space-y-3">
                @for (day of selectedUsageDailyPreview(); track day.date) {
                  <div class="cc-stat-surface p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-[var(--cc-text)]">{{ formatUsageDate(day.date) }}</div>
                        <div class="mt-2 text-xs text-[var(--cc-text-soft)]">{{ day.calls }} assistant calls</div>
                      </div>
                      <cc-pill [tone]="day.totalCostUsd ? 'success' : 'warning'">{{ formatCost(day.totalCostUsd) }}</cc-pill>
                    </div>
                    <dl class="mt-4 grid grid-cols-2 gap-3 text-sm text-[var(--cc-text-muted)]">
                      <div><dt class="text-[var(--cc-text-soft)]">Tokens</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(day.totalTokens) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Cache read</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatTokenCount(day.cacheReadTokens) }}</dd></div>
                    </dl>
                  </div>
                }
              </div>
            }
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Grouped runtime issues</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Warnings and errors that keep recurring</div>
              </div>
              <cc-pill [tone]="errorFeedCount() ? 'danger' : 'success'">{{ errorFeedCount() }} grouped</cc-pill>
            </div>

            @if (openClaw.data()!.logsError && !openClaw.data()!.errorFeed.length) {
              <cc-state-panel class="mt-5" kind="unavailable" title="Grouped runtime issues unavailable" [message]="openClaw.data()!.logsError || 'Unable to collect OpenClaw runtime issues.'"></cc-state-panel>
            } @else if (!openClaw.data()!.errorFeed.length) {
              <cc-state-panel class="mt-5" kind="empty" title="No recurring runtime issues" message="Recent OpenClaw warnings and errors are currently quiet."></cc-state-panel>
            } @else {
              <div class="mt-5 space-y-3">
                @for (group of openClaw.data()!.errorFeed; track group.signature) {
                  <div class="cc-stat-surface p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-[var(--cc-text)]">{{ group.sampleMessage }}</div>
                        <div class="mt-2 text-xs text-[var(--cc-text-soft)]">First seen {{ formatAgeFromTimestamp(group.firstSeen) }} · last seen {{ formatAgeFromTimestamp(group.lastSeen) }}</div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <cc-pill [tone]="logLevelTone(group.severity)">{{ group.severity }}</cc-pill>
                        <cc-pill tone="info">{{ group.source }}</cc-pill>
                        <cc-pill [tone]="group.count > 1 ? 'warning' : 'success'">{{ group.count }}x</cc-pill>
                      </div>
                    </div>
                    <div class="mt-4 space-y-2">
                      @for (occurrence of group.lastOccurrences; track occurrence.timestamp + ':' + occurrence.message) {
                        <div class="rounded-2xl border border-[var(--cc-border)]/70 bg-[var(--cc-surface-muted)]/70 px-3 py-2 font-mono text-xs leading-5 text-[var(--cc-text-muted)]">
                          <span class="text-[var(--cc-text-soft)]">{{ formatClock(occurrence.timestamp) }}</span>
                          <span class="mx-2 text-[var(--cc-text-soft)]">·</span>
                          <span>{{ occurrence.message }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </article>

          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Recent log tail</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Latest OpenClaw runtime log lines</div>
              </div>
              <cc-pill tone="info">{{ openClaw.data()!.logsTail.length }} lines</cc-pill>
            </div>

            @if (openClaw.data()!.logsError && !openClaw.data()!.logsTail.length) {
              <cc-state-panel class="mt-5" kind="unavailable" title="OpenClaw log tail unavailable" [message]="openClaw.data()!.logsError || 'Unable to collect OpenClaw logs.'"></cc-state-panel>
            } @else if (!openClaw.data()!.logsTail.length) {
              <cc-state-panel class="mt-5" kind="empty" title="No recent log lines" message="OpenClaw did not return any recent runtime log lines."></cc-state-panel>
            } @else {
              <div class="mt-5 space-y-3">
                @for (entry of openClaw.data()!.logsTail; track entry.timestamp + ':' + entry.source + ':' + entry.message) {
                  <div class="cc-stat-surface p-4">
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <div class="font-mono text-xs text-[var(--cc-text-soft)]">{{ formatClock(entry.timestamp) }}</div>
                      <div class="flex flex-wrap items-center gap-2">
                        <cc-pill [tone]="logLevelTone(entry.level)">{{ entry.level }}</cc-pill>
                        <cc-pill tone="info">{{ entry.source }}</cc-pill>
                      </div>
                    </div>
                    <div class="mt-3 break-words font-mono text-xs leading-6 text-[var(--cc-text-muted)]">{{ entry.message }}</div>
                  </div>
                }
              </div>
            }
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Active sessions</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">What Atlas is doing right now</div>
              </div>
              <cc-pill tone="info">{{ activeSessionCount() }} live</cc-pill>
            </div>

            @if (!openClaw.data()!.activeSessions.length) {
              <cc-state-panel class="mt-5" kind="empty" title="No recent sessions" message="No OpenClaw sessions were active in the recent window."></cc-state-panel>
            } @else {
              <div class="mt-5 space-y-3">
                @for (session of openClaw.data()!.activeSessions; track session.key) {
                  <div class="cc-stat-surface p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-[var(--cc-text)]">{{ session.name }}</div>
                        <div class="mt-2 text-xs text-[var(--cc-text-soft)]">{{ session.agent }} · {{ session.model }}</div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <cc-pill [tone]="session.active ? 'success' : 'warning'">{{ session.active ? 'active' : 'idle' }}</cc-pill>
                        <cc-pill [tone]="sessionTypeTone(session.type)">{{ session.type }}</cc-pill>
                      </div>
                    </div>
                    <dl class="mt-4 grid gap-3 text-sm text-[var(--cc-text-muted)] md:grid-cols-4">
                      <div><dt class="text-[var(--cc-text-soft)]">Last seen</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatAge(session.ageMs) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Context</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ session.percentUsed == null ? '—' : session.percentUsed + '%' }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Tokens</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ session.totalTokens }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Trigger</dt><dd class="mt-1 truncate font-medium text-[var(--cc-text)]">{{ session.subject || session.label || '—' }}</dd></div>
                    </dl>
                  </div>
                }
              </div>
            }
          </article>

          <article class="cc-list-card p-5">
            <div class="flex items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Recent activity</div>
                <div class="mt-2 text-lg font-semibold text-[var(--cc-text)]">Recent runs and spawned work</div>
              </div>
              <cc-pill tone="info">{{ openClaw.data()!.recentRuns.length }}</cc-pill>
            </div>

            @if (!openClaw.data()!.recentRuns.length) {
              <cc-state-panel class="mt-5" kind="empty" title="No recent spawned work" message="Sub-agent and run activity will show up here once OpenClaw records it."></cc-state-panel>
            } @else {
              <div class="mt-5 space-y-3">
                @for (run of openClaw.data()!.recentRuns; track run.key) {
                  <div class="cc-stat-surface p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-[var(--cc-text)]">{{ run.name }}</div>
                        <div class="mt-2 text-xs text-[var(--cc-text-soft)]">{{ run.agent }} · {{ run.model }}</div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2">
                        <cc-pill [tone]="runStatusTone(run.status)">{{ run.status }}</cc-pill>
                        <cc-pill [tone]="sessionTypeTone(run.type)">{{ run.type }}</cc-pill>
                      </div>
                    </div>
                    <dl class="mt-4 grid gap-3 text-sm text-[var(--cc-text-muted)] md:grid-cols-4">
                      <div><dt class="text-[var(--cc-text-soft)]">Finished</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatAge(run.ageMs) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Duration</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatDuration(run.durationSec) }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Tokens</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ run.totalTokens }}</dd></div>
                      <div><dt class="text-[var(--cc-text-soft)]">Cost</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ formatCost(run.estimatedCostUsd) }}</dd></div>
                    </dl>
                  </div>
                }
              </div>
            }
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
  protected readonly usageWindowOptions: ReadonlyArray<{ key: OpenClawUsageWindowKey; label: string }> = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: 'all', label: 'All time' },
  ];
  protected readonly selectedUsageWindow = signal<OpenClawUsageWindowKey>('7d');
  protected readonly currentVersion = computed(() => this.openClaw.data()?.version || this.openClaw.data()?.gateway?.self?.version || 'unknown');
  protected readonly latestVersion = computed(() => this.openClaw.data()?.updateInfo?.latestVersion || 'available');
  protected readonly showUpdateBadge = computed(() => {
    const latest = this.openClaw.data()?.updateInfo?.latestVersion;
    const current = this.currentVersion();
    return Boolean(latest && current && latest !== current);
  });
  protected readonly activeSessionCount = computed(() => (this.openClaw.data()?.activeSessions ?? []).filter((session) => session.active).length);
  protected readonly errorFeedCount = computed(() => this.openClaw.data()?.errorFeed?.length || 0);
  protected readonly selectedUsageWindowData = computed<OpenClawUsageWindow | null>(() => this.openClaw.data()?.usageAnalytics?.windows?.[this.selectedUsageWindow()] ?? null);
  protected readonly selectedUsageModels = computed<OpenClawUsageModel[]>(() => (this.selectedUsageWindowData()?.models ?? []).slice(0, 8));
  protected readonly selectedUsageCostTrend = computed<number[]>(() => (this.selectedUsageWindowData()?.daily ?? []).slice(-14).map((day) => day.totalCostUsd ?? 0));
  protected readonly selectedUsageDailyPreview = computed<OpenClawUsageDay[]>(() => [...(this.selectedUsageWindowData()?.daily ?? [])].slice(-7).reverse());
  protected readonly usageTopModel = computed(() => this.selectedUsageModels()[0]?.model || '—');
  protected readonly usageCoverageText = computed(() => {
    const window = this.selectedUsageWindowData();
    if (!window || !window.calls) return 'No assistant responses in this window.';
    if (window.costAvailableCalls === window.calls) return `Cost available for all ${window.calls} calls.`;
    return `Cost available for ${window.costAvailableCalls} of ${window.calls} calls.`;
  });
  protected readonly usageFootnote = computed(() => {
    const usage = this.openClaw.data()?.usageAnalytics;
    if (!usage) return 'Usage analytics unavailable.';
    const duplicates = usage.duplicateEvents ? `, deduped ${usage.duplicateEvents} duplicate entries` : '';
    return `${usage.usageEvents} assistant calls across ${usage.filesScanned} transcript files${duplicates}.`;
  });
  protected readonly meta = computed(() => {
    const gateway = this.openClaw.data()?.gateway?.reachable ? 'gateway reachable' : 'gateway down';
    const service = this.openClaw.data()?.gatewayService?.runtime?.status || 'unknown service';
    const sessions = this.activeSessionCount();
    const issues = this.errorFeedCount();
    const spend = this.openClaw.data()?.usageAnalytics?.windows?.today?.totalCostUsd;
    return spend != null
      ? `${gateway} · ${service} · ${sessions} live sessions · ${issues} grouped issues · $${spend.toFixed(2)} today`
      : `${gateway} · ${service} · ${sessions} live sessions · ${issues} grouped issues`;
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

  protected selectUsageWindow(window: OpenClawUsageWindowKey): void {
    this.selectedUsageWindow.set(window);
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

  protected sessionTypeTone(type?: string | null): 'success' | 'danger' | 'warning' | 'info' {
    if (type === 'subagent' || type === 'run') return 'info';
    if (type === 'group') return 'warning';
    if (type === 'cron') return 'danger';
    return 'success';
  }

  protected runStatusTone(status?: string | null): 'success' | 'danger' | 'warning' | 'info' {
    if (status === 'completed') return 'success';
    if (status === 'aborted') return 'danger';
    if (status === 'active') return 'info';
    return 'warning';
  }

  protected logLevelTone(level?: string | null): 'success' | 'danger' | 'warning' | 'info' {
    if (level === 'error') return 'danger';
    if (level === 'warn' || level === 'warning') return 'warning';
    if (level === 'debug') return 'info';
    return 'success';
  }

  protected taskStatus(): string {
    const failures = this.openClaw.data()?.tasks?.failures || 0;
    const warnings = this.openClaw.data()?.taskAudit?.warnings || 0;
    if (!failures && !warnings) return 'Recent runtime jobs look clean.';
    if (failures && warnings) return `${failures} runtime job failures and ${warnings} audit warnings are currently reported.`;
    if (failures) return `${failures} runtime job failures are currently reported.`;
    return `${warnings} runtime audit warnings are currently reported.`;
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

  protected formatMemory(bytes?: number | null): string {
    if (!bytes) return 'memory unavailable';
    return `${(bytes / 1024 / 1024).toFixed(1)} MB RSS`;
  }

  protected formatAgeFromTimestamp(timestamp?: number | null): string {
    if (!timestamp) return '—';
    return this.formatAge(Math.max(0, Date.now() - timestamp));
  }

  protected formatClock(timestamp?: number | null): string {
    if (!timestamp) return '—';
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }

  protected formatDuration(seconds?: number | null): string {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  protected formatCost(value?: number | null): string {
    if (value == null) return '—';
    return `$${value.toFixed(4)}`;
  }

  protected formatTokenCount(value?: number | null): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('en-US', { notation: value >= 1000 ? 'compact' : 'standard', maximumFractionDigits: value >= 1000 ? 1 : 0 }).format(value);
  }

  protected formatUsageDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  protected modelUsageShareLabel(model: OpenClawUsageModel): string {
    const window = this.selectedUsageWindowData();
    if (!window) return '—';

    if (window.totalCostUsd && model.totalCostUsd != null) {
      const share = (model.totalCostUsd / window.totalCostUsd) * 100;
      return `${Math.max(1, Math.round(share))}% spend`;
    }

    if (!window.totalTokens) return '—';
    const share = (model.totalTokens / window.totalTokens) * 100;
    return `${Math.max(1, Math.round(share))}% tokens`;
  }

  protected modelUsageShareTone(model: OpenClawUsageModel): 'success' | 'warning' | 'info' {
    const window = this.selectedUsageWindowData();
    if (!window) return 'info';

    const basis = window.totalCostUsd && model.totalCostUsd != null
      ? (model.totalCostUsd / window.totalCostUsd) * 100
      : window.totalTokens
        ? (model.totalTokens / window.totalTokens) * 100
        : 0;

    if (basis >= 50) return 'warning';
    if (basis >= 20) return 'info';
    return 'success';
  }

  private async copyLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  }
}
