import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import type { OpenClawRunSummary, OpenClawSessionSummary, OpenClawUsageAgent, OpenClawUsageWindowKey } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { STANDARD_PANEL_ACTIONS } from '../../shared/models/panel-action';
import { PanelActionsComponent } from '../../shared/ui/panel-actions.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';
import { SUB_AGENTS, SubAgentDefinition, SubAgentId } from './sub-agent-registry';

type SubAgentState = 'idle' | 'active' | 'recent';

interface SubAgentRuntimeStatus {
  state: SubAgentState;
  matchedTerm: string | null;
  activeSession: OpenClawSessionSummary | null;
  recentRun: OpenClawRunSummary | null;
}

@Component({
  selector: 'app-sub-agents-page',
  imports: [ViewShellComponent, PanelActionsComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Atlas" title="Agents" subtitle="Atlas stays on as the orchestrator at the top, with the worker roster below showing live status and usage for each specialist." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-panel-actions [actions]="headerActions" (actionSelected)="onHeaderAction($event)"></cc-panel-actions>
      </div>

      @if (openClaw.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="OpenClaw activity unavailable" [message]="openClaw.error() || 'Live session matching is unavailable right now, but the agent roster is still available.'"></cc-state-panel>
      }

      <section class="cc-list-card p-5">
        <div class="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <img src="/atlas/atlas-orchestrator-baton.png" alt="Atlas portrait" class="w-full rounded-[24px] border border-[var(--cc-border)]" />
          <div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Agent</div>
                <div class="mt-2 text-3xl font-semibold text-[var(--cc-text)]">Atlas</div>
                <div class="mt-1 text-sm font-medium text-[var(--cc-text-soft)]">The Watchmaker</div>
                <div class="mt-2 text-sm text-[var(--cc-text-muted)]">Primary assistant and orchestrator</div>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <cc-pill [tone]="configuredModelTone('main')">{{ configuredModelLabel('main') }}</cc-pill>
                <cc-pill tone="success">always on</cc-pill>
              </div>
            </div>

            <div class="mt-5 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-soft)] px-4 py-3 text-sm leading-7 text-[var(--cc-text-muted)]">
              Atlas is the steady orchestrator of the roster, decides when to use workers, owns the final synthesis, and stays present even when the specialists are idle.
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <section class="cc-stat-surface p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Role</div>
                <div class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">Conversation owner, orchestrator, and final synthesizer across the worker roster.</div>
              </section>
              <section class="cc-stat-surface p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Delegates to</div>
                <ul class="mt-3 space-y-2 text-sm text-[var(--cc-text-muted)]">
                  <li>• Owl / Glass / Clock for orientation, debugging, and monitoring</li>
                  <li>• Veidt / Spectre for planning and review</li>
                  <li>• Blue / Rorschach for implementation and verification</li>
                  <li>• Mason / Archive for writing and organization</li>
                </ul>
              </section>
              <section class="cc-stat-surface p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Why pinned</div>
                <div class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">This page reads as Atlas plus roster, so the orchestrator stays visible while the worker grid remains easy to scan underneath.</div>
              </section>
            </div>

            <section class="cc-stat-surface mt-4 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Live signal</div>
                <cc-pill tone="success">always on</cc-pill>
              </div>
              <div class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">
                {{ atlasActivitySummary() }}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section class="mt-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Worker roster</div>
            <div class="mt-1 text-sm text-[var(--cc-text-muted)]">Specialists Atlas can keep active or pull in as needed.</div>
          </div>
          <div class="text-xs text-[var(--cc-text-soft)]">{{ agents().length }} workers</div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          @for (agent of agents(); track agent.id) {
            @let runtime = runtimeStatus(agent);
            <article class="cc-list-card p-5">
              <img [src]="agent.portraitPath" [alt]="agent.displayName + ' portrait'" class="w-full rounded-[20px] border border-[var(--cc-border)]" />
              <div class="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div class="text-lg font-semibold text-[var(--cc-text)]">{{ agent.displayName }}</div>
                  <div class="mt-1 text-sm font-medium text-[var(--cc-text-soft)]">{{ agent.operationalName }}</div>
                  <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ agent.role }}</div>
                </div>
                <cc-pill [tone]="statusTone(runtime.state)">{{ statusLabel(runtime.state) }}</cc-pill>
              </div>
              <div class="mt-4 text-sm leading-6 text-[var(--cc-text-muted)]">{{ agent.spawnWhen }}</div>
              <div class="mt-4 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-soft)] px-4 py-3 text-xs leading-5 text-[var(--cc-text-soft)]">
                {{ activitySummary(agent, runtime) }}
              </div>
              <div class="mt-3 flex items-end justify-between gap-3">
                <div class="text-xs text-[var(--cc-text-soft)]">{{ usageSummary(agent.id, 'today') }}</div>
                <cc-pill [tone]="configuredModelTone(agent.id)">{{ configuredModelLabel(agent.id) }}</cc-pill>
              </div>
            </article>
          }
        </div>
      </section>
    </app-view-shell>
  `,
})
export class SubAgentsPage {
  private readonly data = inject(DashboardDataService);

  protected readonly headerActions = STANDARD_PANEL_ACTIONS;
  protected readonly agents = signal(SUB_AGENTS);
  protected readonly openClaw = this.data.openClaw();
  protected readonly meta = computed(() => {
    const statuses = this.agents().map((agent) => this.runtimeStatus(agent).state);
    const active = statuses.filter((state) => state === 'active').length;
    const recent = statuses.filter((state) => state === 'recent').length;
    const sourceStatus = this.openClaw.source()?.status;
    const summary = `Atlas + ${this.agents().length} workers · ${active} active · ${recent} recent`;
    return sourceStatus ? `${summary} · ${sourceStatus}` : summary;
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

  protected statusTone(state: SubAgentState): 'warning' | 'info' | 'success' {
    if (state === 'active') return 'success';
    if (state === 'recent') return 'info';
    return 'warning';
  }

  protected statusLabel(state: SubAgentState): string {
    if (state === 'active') return 'active';
    if (state === 'recent') return 'recent';
    return 'idle';
  }

  protected atlasActivitySummary(): string {
    if (this.openClaw.isUnavailable()) {
      return 'Atlas remains the orchestrator even when live runtime data is temporarily unavailable.';
    }

    const activeSessions = this.openClaw.data()?.activeSessions?.length ?? 0;
    const recentRuns = this.openClaw.data()?.recentRuns?.length ?? 0;
    return `Atlas is pinned as the orchestrator while the runtime currently shows ${activeSessions} active sessions and ${recentRuns} recent runs across the roster.`;
  }

  protected activitySummary(agent: SubAgentDefinition, runtime: SubAgentRuntimeStatus): string {
    if (runtime.activeSession) {
      return `Active match via “${runtime.matchedTerm || agent.operationalName}” in ${runtime.activeSession.name}, updated ${this.timeAgo(runtime.activeSession.updatedAt)}.`;
    }

    if (runtime.recentRun) {
      return `Recent ${runtime.recentRun.status || 'unknown'} run matched via “${runtime.matchedTerm || agent.operationalName}”, last seen ${this.timeAgo(runtime.recentRun.updatedAt)}.`;
    }

    if (this.openClaw.isUnavailable()) {
      return 'Live OpenClaw matching is unavailable right now. The roster card remains available as static doctrine.';
    }

    return 'No active or recent OpenClaw session currently matches this role. It remains available as part of the standing roster.';
  }

  protected configuredModelLabel(agentId: string): string {
    const model = this.openClaw.data()?.configuredAgents?.find((entry) => entry.id === agentId)?.model;
    if (!model) return 'model unknown';
    const [provider, ...rest] = model.split('/');
    const modelId = rest.join('/') || provider;
    return `${provider} · ${modelId}`;
  }

  protected configuredModelTone(agentId: string): 'accent' | 'info' | 'neutral' {
    const model = this.openClaw.data()?.configuredAgents?.find((entry) => entry.id === agentId)?.model || '';
    if (model.startsWith('ollama/')) return 'info';
    if (model.startsWith('openai/')) return 'accent';
    return 'neutral';
  }

  protected usageSummary(agentId: SubAgentId, window: OpenClawUsageWindowKey): string {
    const usage = this.usageForAgent(agentId, window);
    if (usage?.calls) {
      return `${formatCompactNumber(usage.totalTokens)} tokens · ${this.formatCost(usage.totalCostUsd)} · ${usage.calls} calls ${window === 'today' ? 'today' : `in ${window}`}`;
    }

    if (window === 'today') {
      const week = this.usageForAgent(agentId, '7d');
      if (week?.calls) {
        return `No usage today · ${formatCompactNumber(week.totalTokens)} tokens · ${week.calls} calls in 7d`;
      }
    }

    return window === 'today' ? 'No usage recorded today.' : `No usage recorded in ${window}.`;
  }

  protected usageForAgent(agentId: SubAgentId, window: OpenClawUsageWindowKey): OpenClawUsageAgent | null {
    return this.openClaw.data()?.usageAnalytics?.windows?.[window]?.agents?.find((entry) => entry.agent === agentId) ?? null;
  }

  protected formatCost(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    if (value === 0) return '$0.00';
    if (value < 0.01) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(2)}`;
  }

  protected timeAgo(timestamp: number | null | undefined): string {
    if (!timestamp) return 'unknown';
    const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  protected runtimeStatus(agent: SubAgentDefinition): SubAgentRuntimeStatus {
    const data = this.openClaw.data();
    const activeSessions = data?.activeSessions ?? [];
    const recentRuns = data?.recentRuns ?? [];

    const matchedActive = activeSessions.find((session) => session.active && this.matchesAgent(session, agent));
    if (matchedActive) {
      return {
        state: 'active',
        matchedTerm: this.findMatchedTerm(this.searchText(matchedActive), agent.bindingTerms, matchedActive.agent === agent.id ? agent.id : null),
        activeSession: matchedActive,
        recentRun: null,
      };
    }

    const matchedRun = recentRuns.find((run) => this.matchesAgent(run, agent));
    if (matchedRun) {
      return {
        state: 'recent',
        matchedTerm: this.findMatchedTerm(this.searchText(matchedRun), agent.bindingTerms, matchedRun.agent === agent.id ? agent.id : null),
        activeSession: null,
        recentRun: matchedRun,
      };
    }

    return {
      state: 'idle',
      matchedTerm: null,
      activeSession: null,
      recentRun: null,
    };
  }

  private searchText(entry: OpenClawSessionSummary | OpenClawRunSummary): string {
    return [entry.key, entry.sessionId, entry.agent, entry.type, entry.name, entry.model, entry.chatType, entry.label, entry.subject, entry.spawnedBy]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  private matchTerm(entry: OpenClawSessionSummary | OpenClawRunSummary, terms: string[]): boolean {
    const haystack = this.searchText(entry);
    return terms.some((term) => haystack.includes(term.toLowerCase()));
  }

  private matchesAgent(entry: OpenClawSessionSummary | OpenClawRunSummary, agent: SubAgentDefinition): boolean {
    return entry.agent === agent.id || this.matchTerm(entry, agent.bindingTerms);
  }

  private findMatchedTerm(haystack: string, terms: string[], directAgentId: string | null = null): string | null {
    if (directAgentId) return directAgentId;
    return terms.find((term) => haystack.includes(term.toLowerCase())) ?? null;
  }

  private async copyLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  }
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: value >= 1000 ? 1 : 0 }).format(value);
}
