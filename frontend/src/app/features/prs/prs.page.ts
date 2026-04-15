import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { PullRequestItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { STANDARD_PANEL_ACTIONS } from '../../shared/models/panel-action';
import { PanelActionsComponent } from '../../shared/ui/panel-actions.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

type PrSection = {
  key: string;
  title: string;
  subtitle: string;
  items: PullRequestItem[];
};

@Component({
  selector: 'app-prs-page',
  imports: [ViewShellComponent, PanelActionsComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Review" title="Pull Requests" subtitle="Open pull requests with stronger action cues, ownership, and scanability." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-panel-actions [actions]="headerActions" (actionSelected)="onHeaderAction($event)"></cc-panel-actions>
        <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" class="cc-input min-w-64 px-4 py-2 text-sm" placeholder="Search PRs…" />
      </div>

      @if (prs.isLoading()) {
        <cc-state-panel kind="loading" title="Loading pull requests" message="The shared PR resource is fetching current open pull requests."></cc-state-panel>
      } @else if (prs.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="PRs unavailable" [message]="prs.error() || 'The pull request source could not be loaded.'"></cc-state-panel>
      } @else if (!filteredItems().length) {
        <cc-state-panel kind="empty" [title]="allItems().length ? 'No PRs match this filter' : 'No open PRs'" [message]="allItems().length ? 'Try a different search.' : 'There are no open pull requests right now.'"></cc-state-panel>
      } @else {
        <section class="space-y-6">
          @if (pinnedItems().length) {
            <div>
              <div class="cc-section-heading text-amber-300">
                <span>📌</span>
                <span>Pinned</span>
              </div>
              <div class="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                @for (pr of pinnedItems(); track pr.repoFull + '#' + pr.number) {
                  <article class="cc-list-card border-l-4 p-5" [style.borderLeftColor]="prAccent(pr)">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">
                          <span class="cc-label-pill">{{ pr.repo }}</span>
                          <span [class]="reviewBadgeClass(pr)">{{ reviewLabel(pr) }}</span>
                          @if (pr.isDraft) {
                            <span class="cc-label-pill">Draft</span>
                          }
                        </div>
                        <a [href]="pr.url" target="_blank" class="mt-3 block text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-indigo-300">{{ pr.title }}</a>
                        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                          <span>#{{ pr.number }}</span>
                          <span>{{ pr.headRefName }}</span>
                          <span>{{ timeAgo(pr.createdAt) }}</span>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                          <span class="cc-owner-chip">
                            @if (canUseGitHubAvatar(pr.author?.login)) {
                              <img [src]="avatarUrl(pr.author?.login)" [alt]="pr.author?.login || 'author'" class="cc-owner-avatar" />
                            } @else {
                              <span class="cc-owner-avatar cc-owner-avatar-fallback">{{ avatarFallback(pr.author?.login) }}</span>
                            }
                            <span>{{ pr.author?.login || 'Unknown author' }}</span>
                          </span>
                          <span [class]="attentionBadgeClass(pr)">{{ attentionLabel(pr) }}</span>
                        </div>
                      </div>
                      <button type="button" (click)="togglePinned(pr)" class="cc-small-button cc-small-button-accent">Unpin</button>
                    </div>
                  </article>
                }
              </div>
            </div>
          }

          @for (section of sections(); track section.key) {
            <div>
              <div class="cc-section-heading" [class.text-amber-300]="section.key === 'needs-action'" [class.text-[var(--cc-text-soft)]]="section.key !== 'needs-action'">
                <span>{{ section.title }}</span>
                <span class="text-[var(--cc-text-soft)]">{{ section.subtitle }}</span>
              </div>
              <div class="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                @for (pr of section.items; track pr.repoFull + '#' + pr.number) {
                  <article class="cc-list-card border-l-4 p-5" [style.borderLeftColor]="prAccent(pr)">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">
                          <span class="cc-label-pill">{{ pr.repo }}</span>
                          <span [class]="reviewBadgeClass(pr)">{{ reviewLabel(pr) }}</span>
                          @if (pr.isDraft) {
                            <span class="cc-label-pill">Draft</span>
                          }
                        </div>
                        <a [href]="pr.url" target="_blank" class="mt-3 block text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-indigo-300">{{ pr.title }}</a>
                        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                          <span>#{{ pr.number }}</span>
                          <span>{{ pr.headRefName }}</span>
                          <span>{{ timeAgo(pr.createdAt) }}</span>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                          <span class="cc-owner-chip">
                            @if (canUseGitHubAvatar(pr.author?.login)) {
                              <img [src]="avatarUrl(pr.author?.login)" [alt]="pr.author?.login || 'author'" class="cc-owner-avatar" />
                            } @else {
                              <span class="cc-owner-avatar cc-owner-avatar-fallback">{{ avatarFallback(pr.author?.login) }}</span>
                            }
                            <span>{{ pr.author?.login || 'Unknown author' }}</span>
                          </span>
                          <span [class]="attentionBadgeClass(pr)">{{ attentionLabel(pr) }}</span>
                        </div>
                      </div>
                      <button type="button" (click)="togglePinned(pr)" class="cc-small-button">Pin</button>
                    </div>
                  </article>
                }
              </div>
            </div>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class PrsPage {
  private readonly data = inject(DashboardDataService);
  private readonly pins = inject(PinService);

  protected readonly prs = this.data.prs();
  protected readonly searchText = signal('');
  protected readonly headerActions = STANDARD_PANEL_ACTIONS;

  protected readonly allItems = computed(() => this.prs.data() ?? []);
  protected readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter((pr) => {
      const author = pr.author?.login?.toLowerCase() || '';
      const review = this.reviewLabel(pr).toLowerCase();
      return pr.title.toLowerCase().includes(q) || pr.repo.toLowerCase().includes(q) || pr.headRefName.toLowerCase().includes(q) || author.includes(q) || review.includes(q);
    });
  });
  protected readonly pinnedItems = computed(() => this.filteredItems().filter((pr) => this.pins.isPinned('pr', this.prKey(pr))));
  protected readonly unpinnedItems = computed(() => this.filteredItems().filter((pr) => !this.pins.isPinned('pr', this.prKey(pr))));
  protected readonly sections = computed(() => {
    const needsAction = this.unpinnedItems().filter((pr) => this.isActionNeeded(pr));
    const watching = this.unpinnedItems().filter((pr) => !this.isActionNeeded(pr));
    const sections: PrSection[] = [];
    if (needsAction.length) sections.push({ key: 'needs-action', title: 'Needs action', subtitle: `${needsAction.length} PR${needsAction.length === 1 ? '' : 's'} that need review or follow-up`, items: needsAction });
    if (watching.length) sections.push({ key: 'watching', title: 'Watching', subtitle: `${watching.length} PR${watching.length === 1 ? '' : 's'} that are approved or still drafting`, items: watching });
    return sections;
  });
  protected readonly meta = computed(() => {
    const source = this.prs.source();
    const count = this.filteredItems().length;
    const needsAction = this.filteredItems().filter((pr) => this.isActionNeeded(pr)).length;
    const summary = `${count} open PR${count === 1 ? '' : 's'} · ${needsAction} need action`;
    return source?.status ? `${summary} · ${source.status}` : summary;
  });

  protected togglePinned(pr: PullRequestItem): void {
    this.pins.toggle('pr', this.prKey(pr));
  }

  protected onHeaderAction(actionId: string): void {
    if (actionId === 'refresh') {
      this.prs.refresh();
      return;
    }

    if (actionId === 'copy') {
      void this.copyLink();
    }
  }

  protected canUseGitHubAvatar(login?: string | null): boolean {
    return !!login && /^[a-z\d-]+$/i.test(login);
  }

  protected avatarUrl(login?: string | null): string {
    return `https://github.com/${login}.png?size=64`;
  }

  protected avatarFallback(value?: string | null): string {
    const clean = (value || '?').replace(/^app\//, '').replace(/\[bot\]$/i, '').trim();
    return (clean[0] || '?').toUpperCase();
  }

  protected isActionNeeded(pr: PullRequestItem): boolean {
    return !pr.isDraft && pr.reviewDecision !== 'APPROVED';
  }

  protected reviewLabel(pr: PullRequestItem): string {
    if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'Changes requested';
    if (pr.reviewDecision === 'APPROVED') return 'Approved';
    if (pr.isDraft) return 'Draft';
    return 'Needs review';
  }

  protected attentionLabel(pr: PullRequestItem): string {
    if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'Author follow-up';
    if (pr.reviewDecision === 'APPROVED') return 'Ready to merge';
    if (pr.isDraft) return 'FYI';
    return 'Review needed';
  }

  protected reviewBadgeClass(pr: PullRequestItem): string {
    if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'cc-label-pill border-[var(--cc-danger-border)] bg-[var(--cc-danger-surface)] text-[var(--cc-danger-text)]';
    if (pr.reviewDecision === 'APPROVED') return 'cc-label-pill border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
    if (pr.isDraft) return 'cc-label-pill border-white/10 bg-white/5 text-[var(--cc-text-muted)]';
    return 'cc-label-pill border-[var(--cc-info-border)] bg-[var(--cc-info-surface)] text-[var(--cc-info-text)]';
  }

  protected attentionBadgeClass(pr: PullRequestItem): string {
    if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'cc-label-pill border-[var(--cc-danger-border)] bg-[var(--cc-danger-surface)] text-[var(--cc-danger-text)]';
    if (pr.reviewDecision === 'APPROVED') return 'cc-label-pill border-emerald-400/25 bg-emerald-500/10 text-emerald-100';
    if (pr.isDraft) return 'cc-label-pill border-white/10 bg-white/5 text-[var(--cc-text-muted)]';
    return 'cc-label-pill border-amber-400/25 bg-amber-500/10 text-amber-100';
  }

  protected prAccent(pr: PullRequestItem): string {
    if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'rgba(251, 113, 133, 0.8)';
    if (pr.reviewDecision === 'APPROVED') return 'rgba(52, 211, 153, 0.8)';
    if (pr.isDraft) return 'rgba(148, 163, 184, 0.5)';
    return 'rgba(56, 189, 248, 0.8)';
  }

  private async copyLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  }

  protected timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return 'unknown';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  private prKey(pr: PullRequestItem): string {
    return `${pr.repoFull}#${pr.number}`;
  }
}
