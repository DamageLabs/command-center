import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { IssueItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

type IssueSection = {
  key: string;
  title: string;
  subtitle: string;
  items: IssueItem[];
};

@Component({
  selector: 'app-issue-list-page',
  imports: [ViewShellComponent, StatePanelComponent],
  template: `
    <app-view-shell [eyebrow]="eyebrow()" [title]="title()" [subtitle]="subtitle()" [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button type="button" (click)="issues.refresh()" class="cc-action-button">Refresh</button>
        <input
          [value]="searchText()"
          (input)="searchText.set($any($event.target).value)"
          class="cc-input min-w-64 px-4 py-2 text-sm"
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
        <section class="space-y-6">
          @if (pinnedItems().length) {
            <div>
              <div class="cc-section-heading text-amber-300">
                <span>📌</span>
                <span>Pinned</span>
              </div>
              <div class="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                @for (issue of pinnedItems(); track issue.repoFull + '#' + issue.number) {
                  <article class="cc-list-card border-l-4 p-5" [style.borderLeftColor]="issueAccent(issue)">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">
                          <span class="cc-label-pill">{{ issue.repo }}</span>
                          <span [class]="priorityBadgeClass(issue)">{{ priorityLabel(issue) }}</span>
                          @if (issue.milestone) {
                            <span class="cc-label-pill">{{ issue.milestone.title }}</span>
                          }
                        </div>
                        <a [href]="issue.url" target="_blank" class="mt-3 block text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-indigo-300">{{ issue.title }}</a>
                        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                          <span>#{{ issue.number }}</span>
                          <span>{{ timeAgo(issue.createdAt) }}</span>
                          <span [class]="ownerStateClass(issue)">{{ ownerStateLabel(issue) }}</span>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                          @for (label of visibleLabels(issue); track label.name) {
                            <span class="cc-label-pill">{{ label.name }}</span>
                          }
                          @if (issue.labels.length > visibleLabels(issue).length) {
                            <span class="cc-label-pill">+{{ issue.labels.length - visibleLabels(issue).length }}</span>
                          }
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                          @if (issue.assignees.length) {
                            @for (assignee of issue.assignees.slice(0, 3); track assignee.login || assignee.name || $index) {
                              <span class="cc-owner-chip">
                                @if (assignee.login) {
                                  <img [src]="avatarUrl(assignee.login)" [alt]="assignee.login" class="cc-owner-avatar" />
                                } @else {
                                  <span class="cc-owner-avatar cc-owner-avatar-fallback">?</span>
                                }
                                <span>{{ assignee.login || assignee.name || 'Assigned' }}</span>
                              </span>
                            }
                            @if (issue.assignees.length > 3) {
                              <span class="cc-owner-chip">+{{ issue.assignees.length - 3 }}</span>
                            }
                          } @else {
                            <span class="cc-owner-chip border-amber-400/25 bg-amber-500/10 text-amber-100">Needs owner</span>
                          }
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <button type="button" (click)="togglePinned(issue)" class="cc-small-button cc-small-button-accent">Unpin</button>
                        <button type="button" (click)="close(issue)" class="cc-small-button cc-small-button-danger">Close</button>
                      </div>
                    </div>
                  </article>
                }
              </div>
            </div>
          }

          @for (section of sections(); track section.key) {
            <div>
              <div class="cc-section-heading" [class.text-amber-300]="section.key === 'needs-owner'" [class.text-[var(--cc-text-soft)]]="section.key !== 'needs-owner'">
                <span>{{ section.title }}</span>
                <span class="text-[var(--cc-text-soft)]">{{ section.subtitle }}</span>
              </div>
              <div class="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                @for (issue of section.items; track issue.repoFull + '#' + issue.number) {
                  <article class="cc-list-card border-l-4 p-5" [style.borderLeftColor]="issueAccent(issue)">
                    <div class="flex items-start justify-between gap-4">
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">
                          <span class="cc-label-pill">{{ issue.repo }}</span>
                          <span [class]="priorityBadgeClass(issue)">{{ priorityLabel(issue) }}</span>
                          @if (issue.milestone) {
                            <span class="cc-label-pill">{{ issue.milestone.title }}</span>
                          }
                        </div>
                        <a [href]="issue.url" target="_blank" class="mt-3 block text-base font-semibold leading-6 text-[var(--cc-text)] transition hover:text-indigo-300">{{ issue.title }}</a>
                        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                          <span>#{{ issue.number }}</span>
                          <span>{{ timeAgo(issue.createdAt) }}</span>
                          <span [class]="ownerStateClass(issue)">{{ ownerStateLabel(issue) }}</span>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                          @for (label of visibleLabels(issue); track label.name) {
                            <span class="cc-label-pill">{{ label.name }}</span>
                          }
                          @if (issue.labels.length > visibleLabels(issue).length) {
                            <span class="cc-label-pill">+{{ issue.labels.length - visibleLabels(issue).length }}</span>
                          }
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                          @if (issue.assignees.length) {
                            @for (assignee of issue.assignees.slice(0, 3); track assignee.login || assignee.name || $index) {
                              <span class="cc-owner-chip">
                                @if (assignee.login) {
                                  <img [src]="avatarUrl(assignee.login)" [alt]="assignee.login" class="cc-owner-avatar" />
                                } @else {
                                  <span class="cc-owner-avatar cc-owner-avatar-fallback">?</span>
                                }
                                <span>{{ assignee.login || assignee.name || 'Assigned' }}</span>
                              </span>
                            }
                            @if (issue.assignees.length > 3) {
                              <span class="cc-owner-chip">+{{ issue.assignees.length - 3 }}</span>
                            }
                          } @else {
                            <span class="cc-owner-chip border-amber-400/25 bg-amber-500/10 text-amber-100">Needs owner</span>
                          }
                        </div>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <button type="button" (click)="togglePinned(issue)" class="cc-small-button">Pin</button>
                        <button type="button" (click)="close(issue)" class="cc-small-button cc-small-button-danger">Close</button>
                      </div>
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
    const unassigned = this.filteredItems().filter((issue) => !issue.assignees.length).length;
    const summary = `${count} issue${count === 1 ? '' : 's'} · ${unassigned} unassigned${repo ? ` · ${repo}` : ''}`;
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
      const assignees = issue.assignees.map((assignee) => assignee.login || assignee.name || '').join(' ').toLowerCase();
      const milestone = issue.milestone?.title.toLowerCase() || '';
      const matchesRepo = !repo || issue.repo.toLowerCase() === repo;
      const matchesText = !q || issue.title.toLowerCase().includes(q) || issue.repo.toLowerCase().includes(q) || labels.includes(q) || assignees.includes(q) || milestone.includes(q);
      return matchesRepo && matchesText;
    });
  });

  protected readonly pinnedItems = computed(() => this.filteredItems().filter((issue) => this.pins.isPinned('issue', this.issueKey(issue))));
  protected readonly unpinnedItems = computed(() => this.filteredItems().filter((issue) => !this.pins.isPinned('issue', this.issueKey(issue))));
  protected readonly sections = computed(() => {
    const unassigned = this.unpinnedItems().filter((issue) => !issue.assignees.length);
    const assigned = this.unpinnedItems().filter((issue) => issue.assignees.length > 0);
    const sections: IssueSection[] = [];
    if (unassigned.length) sections.push({ key: 'needs-owner', title: 'Needs owner', subtitle: `${unassigned.length} issue${unassigned.length === 1 ? '' : 's'} without an assignee`, items: unassigned });
    if (assigned.length) sections.push({ key: 'owned', title: 'Assigned', subtitle: `${assigned.length} issue${assigned.length === 1 ? '' : 's'} already owned`, items: assigned });
    return sections;
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.repoFilter.set(params.get('repo'));
    });
  }

  protected visibleLabels(issue: IssueItem) {
    return issue.labels.slice(0, 4);
  }

  protected togglePinned(issue: IssueItem): void {
    this.pins.toggle('issue', this.issueKey(issue));
  }

  protected close(issue: IssueItem): void {
    if (!window.confirm(`Close issue #${issue.number}?`)) return;
    this.data.closeIssue(issue.repoFull, issue.number);
  }

  protected avatarUrl(login?: string | null): string {
    return `https://github.com/${encodeURIComponent(login || 'ghost')}.png?size=64`;
  }

  protected ownerStateLabel(issue: IssueItem): string {
    return issue.assignees.length ? `${issue.assignees.length} owner${issue.assignees.length === 1 ? '' : 's'}` : 'Needs owner';
  }

  protected ownerStateClass(issue: IssueItem): string {
    return issue.assignees.length
      ? 'text-emerald-300 font-medium'
      : 'text-amber-300 font-semibold';
  }

  protected priorityLabel(issue: IssueItem): string {
    if (issue.priority === 'urgent') return 'Urgent';
    if (issue.priority === 'active') return 'Active';
    return 'Backlog';
  }

  protected priorityBadgeClass(issue: IssueItem): string {
    if (issue.priority === 'urgent') return 'cc-label-pill border-rose-400/25 bg-rose-500/10 text-rose-100';
    if (issue.priority === 'active') return 'cc-label-pill border-sky-400/25 bg-sky-500/10 text-sky-100';
    return 'cc-label-pill border-white/10 bg-white/5 text-[var(--cc-text-muted)]';
  }

  protected issueAccent(issue: IssueItem): string {
    if (issue.priority === 'urgent') return 'rgba(251, 113, 133, 0.8)';
    if (issue.priority === 'active') return 'rgba(56, 189, 248, 0.8)';
    return 'rgba(148, 163, 184, 0.5)';
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
