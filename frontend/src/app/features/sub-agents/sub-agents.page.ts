import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import type { OpenClawRunSummary, OpenClawSessionSummary } from '../../models/api';
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
    <app-view-shell eyebrow="Atlas" title="Sub-agents" subtitle="Atlas's worker roster, including when to use each specialist and whether any matching OpenClaw activity is visible right now." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-panel-actions [actions]="headerActions" (actionSelected)="onHeaderAction($event)"></cc-panel-actions>
      </div>

      @if (openClaw.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="OpenClaw activity unavailable" [message]="openClaw.error() || 'Live session matching is unavailable right now, but the sub-agent roster is still available.'"></cc-state-panel>
      }

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="grid gap-4 md:grid-cols-2">
          @for (agent of agents(); track agent.id) {
            @let runtime = runtimeStatus(agent);
            <button type="button" (click)="selectAgent(agent.id)" class="cc-list-card p-5 text-left transition-transform" [style.border-color]="selectedAgentId() === agent.id ? 'var(--cc-accent-border)' : null" [style.box-shadow]="selectedAgentId() === agent.id ? '0 0 0 1px var(--cc-accent-border), var(--cc-shadow-md)' : null">
              <img [src]="agent.portraitPath" [alt]="agent.name + ' portrait'" class="w-full rounded-[20px] border border-[var(--cc-border)]" />
              <div class="mt-4 flex items-start justify-between gap-3">
                <div>
                  <div class="text-lg font-semibold text-[var(--cc-text)]">{{ agent.name }}</div>
                  <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ agent.role }}</div>
                </div>
                <cc-pill [tone]="statusTone(runtime.state)">{{ statusLabel(runtime.state) }}</cc-pill>
              </div>
              <div class="mt-4 text-sm leading-6 text-[var(--cc-text-muted)]">{{ agent.spawnWhen }}</div>
              <div class="mt-4 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-soft)] px-4 py-3 text-xs leading-5 text-[var(--cc-text-soft)]">
                {{ activitySummary(agent, runtime) }}
              </div>
            </button>
          }
        </div>

        <article class="cc-list-card p-5">
          @if (selectedAgent(); as agent) {
            @let runtime = selectedRuntime();
            <img [src]="agent.portraitPath" [alt]="agent.name + ' portrait'" class="w-full rounded-[24px] border border-[var(--cc-border)]" />
            <div class="mt-5 flex items-start justify-between gap-3">
              <div>
                <div class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">Sub-agent</div>
                <div class="mt-2 text-2xl font-semibold text-[var(--cc-text)]">{{ agent.name }}</div>
                <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ agent.role }}</div>
              </div>
              <cc-pill [tone]="statusTone(runtime.state)">{{ statusLabel(runtime.state) }}</cc-pill>
            </div>

            <div class="mt-5 rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-soft)] px-4 py-3 text-sm leading-7 text-[var(--cc-text-muted)]">
              {{ agent.description }}
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <section class="cc-stat-surface p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Spawn when</div>
                <div class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">{{ agent.spawnWhen }}</div>
              </section>
              <section class="cc-stat-surface p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Good tasks</div>
                <ul class="mt-3 space-y-2 text-sm text-[var(--cc-text-muted)]">
                  @for (item of agent.goodTasks; track item) {
                    <li>• {{ item }}</li>
                  }
                </ul>
              </section>
              <section class="cc-stat-surface p-4">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Avoid</div>
                <ul class="mt-3 space-y-2 text-sm text-[var(--cc-text-muted)]">
                  @for (item of agent.badTasks; track item) {
                    <li>• {{ item }}</li>
                  }
                </ul>
              </section>
            </div>

            <section class="cc-stat-surface mt-4 p-4">
              <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Output contract</div>
              <ul class="mt-3 space-y-2 text-sm text-[var(--cc-text-muted)]">
                @for (item of agent.outputContract; track item) {
                  <li>• {{ item }}</li>
                }
              </ul>
            </section>

            <section class="cc-stat-surface mt-4 p-4">
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">Live signal</div>
                <cc-pill [tone]="statusTone(runtime.state)">{{ statusLabel(runtime.state) }}</cc-pill>
              </div>
              <div class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">
                {{ activitySummary(agent, runtime) }}
              </div>
              @if (runtime.activeSession) {
                <dl class="mt-4 grid gap-3 text-sm text-[var(--cc-text-muted)] md:grid-cols-2">
                  <div><dt class="text-[var(--cc-text-soft)]">Session</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ runtime.activeSession.name }}</dd></div>
                  <div><dt class="text-[var(--cc-text-soft)]">Updated</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ timeAgo(runtime.activeSession.updatedAt) }}</dd></div>
                </dl>
              } @else if (runtime.recentRun) {
                <dl class="mt-4 grid gap-3 text-sm text-[var(--cc-text-muted)] md:grid-cols-2">
                  <div><dt class="text-[var(--cc-text-soft)]">Recent run</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ runtime.recentRun.name }}</dd></div>
                  <div><dt class="text-[var(--cc-text-soft)]">Outcome</dt><dd class="mt-1 font-medium text-[var(--cc-text)]">{{ runtime.recentRun.status || 'unknown' }}</dd></div>
                </dl>
              }
            </section>
          }
        </article>
      </section>
    </app-view-shell>
  `,
})
export class SubAgentsPage {
  private readonly data = inject(DashboardDataService);

  protected readonly headerActions = STANDARD_PANEL_ACTIONS;
  protected readonly agents = signal(SUB_AGENTS);
  protected readonly openClaw = this.data.openClaw();
  protected readonly selectedAgentId = signal<SubAgentId>(SUB_AGENTS[0].id);
  protected readonly selectedAgent = computed(() => this.agents().find((agent) => agent.id === this.selectedAgentId()) ?? this.agents()[0]);
  protected readonly selectedRuntime = computed(() => this.runtimeStatus(this.selectedAgent()));
  protected readonly meta = computed(() => {
    const statuses = this.agents().map((agent) => this.runtimeStatus(agent).state);
    const active = statuses.filter((state) => state === 'active').length;
    const recent = statuses.filter((state) => state === 'recent').length;
    const sourceStatus = this.openClaw.source()?.status;
    const summary = `${this.agents().length} agents · ${active} active · ${recent} recent`;
    return sourceStatus ? `${summary} · ${sourceStatus}` : summary;
  });

  protected selectAgent(agentId: SubAgentId): void {
    this.selectedAgentId.set(agentId);
  }

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

  protected activitySummary(agent: SubAgentDefinition, runtime: SubAgentRuntimeStatus): string {
    if (runtime.activeSession) {
      return `Active match via “${runtime.matchedTerm || agent.name}” in ${runtime.activeSession.name}, updated ${this.timeAgo(runtime.activeSession.updatedAt)}.`;
    }

    if (runtime.recentRun) {
      return `Recent ${runtime.recentRun.status || 'unknown'} run matched via “${runtime.matchedTerm || agent.name}”, last seen ${this.timeAgo(runtime.recentRun.updatedAt)}.`;
    }

    if (this.openClaw.isUnavailable()) {
      return 'Live OpenClaw matching is unavailable right now. The roster card remains available as static doctrine.';
    }

    return 'No active or recent OpenClaw session currently matches this role. It remains available as part of the standing roster.';
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

    const matchedActive = activeSessions.find((session) => session.active && this.matchTerm(session, agent.bindingTerms));
    if (matchedActive) {
      return {
        state: 'active',
        matchedTerm: this.findMatchedTerm(this.searchText(matchedActive), agent.bindingTerms),
        activeSession: matchedActive,
        recentRun: null,
      };
    }

    const matchedRun = recentRuns.find((run) => this.matchTerm(run, agent.bindingTerms));
    if (matchedRun) {
      return {
        state: 'recent',
        matchedTerm: this.findMatchedTerm(this.searchText(matchedRun), agent.bindingTerms),
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

  private findMatchedTerm(haystack: string, terms: string[]): string | null {
    return terms.find((term) => haystack.includes(term.toLowerCase())) ?? null;
  }

  private async copyLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  }
}
