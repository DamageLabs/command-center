import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { PullRequestItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-prs-page',
  imports: [ViewShellComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Review" title="Pull Requests" subtitle="Open pull requests with search, pinning, and review status." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button type="button" (click)="prs.refresh()" class="cc-action-button">Refresh</button>
        <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" class="cc-input min-w-64 px-4 py-2 text-sm" placeholder="Search PRs…" />
      </div>

      @if (prs.isLoading()) {
        <cc-state-panel kind="loading" title="Loading pull requests" message="The shared PR resource is fetching current open pull requests."></cc-state-panel>
      } @else if (prs.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="PRs unavailable" [message]="prs.error() || 'The pull request source could not be loaded.'"></cc-state-panel>
      } @else if (!filteredItems().length) {
        <cc-state-panel kind="empty" [title]="allItems().length ? 'No PRs match this filter' : 'No open PRs'" [message]="allItems().length ? 'Try a different search.' : 'There are no open pull requests right now.'"></cc-state-panel>
      } @else {
        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @if (pinnedItems().length) {
            <div class="lg:col-span-2 2xl:col-span-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"><span>📌</span><span>Pinned</span></div>
            @for (pr of pinnedItems(); track pr.repoFull + '#' + pr.number) {
              <article class="cc-list-card p-5">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <a [href]="pr.url" target="_blank" class="text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-indigo-300">{{ pr.title }}</a>
                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                      <span class="font-semibold text-sky-300">{{ pr.repo }}</span>
                      <span>#{{ pr.number }}</span>
                      <span>{{ pr.headRefName }}</span>
                      <span>{{ timeAgo(pr.createdAt) }}</span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs">
                      @if (pr.isDraft) {
                        <span class="cc-label-pill">Draft</span>
                      }
                      @if (pr.reviewDecision === 'APPROVED') {
                        <span class="cc-label-pill border-emerald-400/25 bg-emerald-500/10 text-emerald-100">Approved</span>
                      }
                      @if (pr.reviewDecision === 'CHANGES_REQUESTED') {
                        <span class="cc-label-pill border-rose-400/25 bg-rose-500/10 text-rose-100">Changes requested</span>
                      }
                    </div>
                  </div>
                  <button type="button" (click)="togglePinned(pr)" class="cc-small-button cc-small-button-accent">Unpin</button>
                </div>
              </article>
            }
            @if (unpinnedItems().length) {
              <div class="lg:col-span-2 2xl:col-span-3 border-t border-[var(--cc-border)]"></div>
            }
          }

          @for (pr of unpinnedItems(); track pr.repoFull + '#' + pr.number) {
            <article class="cc-list-card p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <a [href]="pr.url" target="_blank" class="text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-indigo-300">{{ pr.title }}</a>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                    <span class="font-semibold text-sky-300">{{ pr.repo }}</span>
                    <span>#{{ pr.number }}</span>
                    <span>{{ pr.headRefName }}</span>
                    <span>{{ timeAgo(pr.createdAt) }}</span>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2 text-xs">
                    @if (pr.isDraft) {
                      <span class="cc-label-pill">Draft</span>
                    }
                    @if (pr.reviewDecision === 'APPROVED') {
                      <span class="cc-label-pill border-emerald-400/25 bg-emerald-500/10 text-emerald-100">Approved</span>
                    }
                    @if (pr.reviewDecision === 'CHANGES_REQUESTED') {
                      <span class="cc-label-pill border-rose-400/25 bg-rose-500/10 text-rose-100">Changes requested</span>
                    }
                  </div>
                </div>
                <button type="button" (click)="togglePinned(pr)" class="cc-small-button">Pin</button>
              </div>
            </article>
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

  protected readonly allItems = computed(() => this.prs.data() ?? []);
  protected readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter((pr) => {
      const author = pr.author?.login?.toLowerCase() || '';
      return pr.title.toLowerCase().includes(q) || pr.repo.toLowerCase().includes(q) || pr.headRefName.toLowerCase().includes(q) || author.includes(q);
    });
  });
  protected readonly pinnedItems = computed(() => this.filteredItems().filter((pr) => this.pins.isPinned('pr', this.prKey(pr))));
  protected readonly unpinnedItems = computed(() => this.filteredItems().filter((pr) => !this.pins.isPinned('pr', this.prKey(pr))));
  protected readonly meta = computed(() => {
    const source = this.prs.source();
    const count = this.filteredItems().length;
    const drafts = this.allItems().filter((pr) => pr.isDraft).length;
    const summary = `${count} open PR${count === 1 ? '' : 's'} · ${drafts} draft${drafts === 1 ? '' : 's'}`;
    return source?.status ? `${summary} · ${source.status}` : summary;
  });

  protected togglePinned(pr: PullRequestItem): void {
    this.pins.toggle('pr', this.prKey(pr));
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
