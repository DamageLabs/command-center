import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { IssueItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-issue-list-page',
  imports: [ViewShellComponent, StatePanelComponent],
  template: `
    <app-view-shell [eyebrow]="eyebrow()" [title]="title()" [subtitle]="subtitle()" [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          (click)="issues.refresh()"
          class="inline-flex items-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]"
        >
          Refresh
        </button>
        <input
          [value]="searchText()"
          (input)="searchText.set($any($event.target).value)"
          class="min-w-64 rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm text-[var(--cc-text)] outline-none transition focus:border-amber-300/40"
          placeholder="Search issues…"
        />
      </div>

      @if (issues.isLoading()) {
        <cc-state-panel kind="loading" title="Loading issues" message="The shared issues resource is fetching the current GitHub queue for this view."></cc-state-panel>
      } @else if (issues.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Issues unavailable" [message]="issues.error() || 'The issues source could not be loaded.'"></cc-state-panel>
      } @else if (!filteredItems().length) {
        <cc-state-panel
          kind="empty"
          [title]="allItems().length ? 'No issues match this filter' : 'No issues in this view'"
          [message]="allItems().length ? 'Try a different search or clear the current filter.' : 'There are no items in this issue bucket right now.'"
        ></cc-state-panel>
      } @else {
        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @if (pinnedItems().length) {
            <div class="lg:col-span-2 2xl:col-span-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
              <span>📌</span>
              <span>Pinned</span>
            </div>
            @for (issue of pinnedItems(); track issue.repoFull + '#' + issue.number) {
              <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <a [href]="issue.url" target="_blank" class="text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-amber-300">{{ issue.title }}</a>
                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                      <span class="font-semibold text-amber-300">{{ issue.repo }}</span>
                      <span>#{{ issue.number }}</span>
                      <span>{{ timeAgo(issue.createdAt) }}</span>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      @for (label of issue.labels.slice(0, 3); track label.name) {
                        <span class="rounded-full bg-[var(--cc-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--cc-text-muted)]">{{ label.name }}</span>
                      }
                    </div>
                  </div>
                  <div class="flex shrink-0 items-center gap-2">
                    <button type="button" (click)="togglePinned(issue)" class="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">Unpin</button>
                    <button type="button" (click)="close(issue)" class="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200">Close</button>
                  </div>
                </div>
              </article>
            }
            @if (unpinnedItems().length) {
              <div class="lg:col-span-2 2xl:col-span-3 border-t border-[var(--cc-border)]"></div>
            }
          }

          @for (issue of unpinnedItems(); track issue.repoFull + '#' + issue.number) {
            <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <a [href]="issue.url" target="_blank" class="text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-amber-300">{{ issue.title }}</a>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                    <span class="font-semibold text-amber-300">{{ issue.repo }}</span>
                    <span>#{{ issue.number }}</span>
                    <span>{{ timeAgo(issue.createdAt) }}</span>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (label of issue.labels.slice(0, 3); track label.name) {
                      <span class="rounded-full bg-[var(--cc-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--cc-text-muted)]">{{ label.name }}</span>
                    }
                  </div>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <button type="button" (click)="togglePinned(issue)" class="rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--cc-text-muted)]">Pin</button>
                  <button type="button" (click)="close(issue)" class="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200">Close</button>
                </div>
              </div>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class IssueListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(DashboardDataService);
  private readonly pins = inject(PinService);

  protected readonly issues = this.data.issues();
  protected readonly searchText = signal('');
  protected readonly repoFilter = signal<string | null>(this.route.snapshot.queryParamMap.get('repo'));

  protected readonly priority = this.route.snapshot.data['priority'] as 'urgent' | 'active' | 'backlog';
  protected readonly title = computed(() => this.route.snapshot.data['title'] as string);
  protected readonly subtitle = computed(() => this.route.snapshot.data['subtitle'] as string);
  protected readonly eyebrow = computed(() => this.route.snapshot.data['eyebrow'] as string);
  protected readonly meta = computed(() => {
    const source = this.issues.source();
    const count = this.filteredItems().length;
    const repo = this.repoFilter();
    const summary = `${count} issue${count === 1 ? '' : 's'}${repo ? ` · ${repo}` : ''}`;
    return source?.status ? `${summary} · ${source.status}` : summary;
  });

  protected readonly allItems = computed(() => {
    const data = this.issues.data();
    if (!data) return [] as IssueItem[];
    if (this.priority === 'urgent') return data.urgent;
    if (this.priority === 'active') return data.active;
    return data.deferred;
  });

  protected readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    const repo = this.repoFilter()?.toLowerCase() || null;
    return this.allItems().filter((issue) => {
      const labels = issue.labels.map((label) => label.name).join(' ').toLowerCase();
      const matchesRepo = !repo || issue.repo.toLowerCase() === repo;
      const matchesText = !q || issue.title.toLowerCase().includes(q) || issue.repo.toLowerCase().includes(q) || labels.includes(q);
      return matchesRepo && matchesText;
    });
  });

  protected readonly pinnedItems = computed(() => this.filteredItems().filter((issue) => this.pins.isPinned('issue', this.issueKey(issue))));
  protected readonly unpinnedItems = computed(() => this.filteredItems().filter((issue) => !this.pins.isPinned('issue', this.issueKey(issue))));

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.repoFilter.set(params.get('repo'));
    });
  }

  protected togglePinned(issue: IssueItem): void {
    this.pins.toggle('issue', this.issueKey(issue));
  }

  protected close(issue: IssueItem): void {
    if (!window.confirm(`Close issue #${issue.number}?`)) return;
    this.data.closeIssue(issue.repoFull, issue.number);
  }

  protected timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return 'unknown';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  private issueKey(issue: IssueItem): string {
    return `${issue.repoFull}#${issue.number}`;
  }
}
