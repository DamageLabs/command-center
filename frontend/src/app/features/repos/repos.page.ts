import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { RepoSummary } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-repos-page',
  imports: [ViewShellComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Repositories" title="Repositories" subtitle="Repository health, open issue counts, and quick handoff into issue views." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button type="button" (click)="repos.refresh()" class="inline-flex items-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]">Refresh</button>
        <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" class="min-w-64 rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm text-[var(--cc-text)] outline-none transition focus:border-amber-300/40" placeholder="Search repos…" />
      </div>

      @if (repos.isLoading()) {
        <cc-state-panel kind="loading" title="Loading repositories" message="Reading tracked repository health and issue counts from the shared repo resource."></cc-state-panel>
      } @else if (repos.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Repos unavailable" [message]="repos.error() || 'Repository health could not be loaded.'"></cc-state-panel>
      } @else if (!filteredItems().length) {
        <cc-state-panel kind="empty" [title]="allItems().length ? 'No repos match this filter' : 'No repos configured'" [message]="allItems().length ? 'Try a different search.' : 'Add tracked repos in command-center config to populate this view.'"></cc-state-panel>
      } @else {
        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @if (pinnedItems().length) {
            <div class="lg:col-span-2 2xl:col-span-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"><span>📌</span><span>Pinned</span></div>
            @for (repo of pinnedItems(); track repo.repoFull) {
              <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-base font-semibold text-[var(--cc-text)]">{{ repo.repo }}</div>
                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                      @if (repo.archived) {
                        <span>archived</span>
                      }
                      @if (repo.tracked) {
                        <span class="text-emerald-300">tracked</span>
                      }
                    </div>
                  </div>
                  <button type="button" (click)="togglePinned(repo)" class="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">Unpin</button>
                </div>
                <div class="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div class="rounded-2xl bg-[var(--cc-surface-muted)] p-3"><div class="text-[var(--cc-text-soft)]">Open</div><div class="mt-1 font-semibold text-[var(--cc-text)]">{{ repo.openIssues }}</div></div>
                  <div class="rounded-2xl bg-[var(--cc-surface-muted)] p-3"><div class="text-[var(--cc-text-soft)]">Bugs</div><div class="mt-1 font-semibold text-rose-300">{{ repo.bugs }}</div></div>
                  <div class="rounded-2xl bg-[var(--cc-surface-muted)] p-3"><div class="text-[var(--cc-text-soft)]">Features</div><div class="mt-1 font-semibold text-sky-300">{{ repo.enhancements }}</div></div>
                </div>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button type="button" (click)="openIssueFilter(repo)" class="rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-muted)]">View in issues</button>
                  <a [href]="'https://github.com/' + repo.repoFull + '/issues'" target="_blank" class="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">GitHub ↗</a>
                </div>
              </article>
            }
            @if (unpinnedItems().length) {
              <div class="lg:col-span-2 2xl:col-span-3 border-t border-[var(--cc-border)]"></div>
            }
          }

          @for (repo of unpinnedItems(); track repo.repoFull) {
            <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-base font-semibold text-[var(--cc-text)]">{{ repo.repo }}</div>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                    @if (repo.archived) {
                      <span>archived</span>
                    }
                    @if (repo.tracked) {
                      <span class="text-emerald-300">tracked</span>
                    }
                    @if (repo.lastActivity) {
                      <span>Last issue {{ timeAgo(repo.lastActivity) }}</span>
                    }
                  </div>
                </div>
                <button type="button" (click)="togglePinned(repo)" class="rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--cc-text-muted)]">Pin</button>
              </div>
              <div class="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div class="rounded-2xl bg-[var(--cc-surface-muted)] p-3"><div class="text-[var(--cc-text-soft)]">Open</div><div class="mt-1 font-semibold text-[var(--cc-text)]">{{ repo.openIssues }}</div></div>
                <div class="rounded-2xl bg-[var(--cc-surface-muted)] p-3"><div class="text-[var(--cc-text-soft)]">Bugs</div><div class="mt-1 font-semibold text-rose-300">{{ repo.bugs }}</div></div>
                <div class="rounded-2xl bg-[var(--cc-surface-muted)] p-3"><div class="text-[var(--cc-text-soft)]">Features</div><div class="mt-1 font-semibold text-sky-300">{{ repo.enhancements }}</div></div>
              </div>
              <div class="mt-4 flex flex-wrap gap-3">
                <button type="button" (click)="openIssueFilter(repo)" class="rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-muted)]">View in issues</button>
                <a [href]="'https://github.com/' + repo.repoFull + '/issues'" target="_blank" class="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">GitHub ↗</a>
              </div>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class ReposPage {
  private readonly data = inject(DashboardDataService);
  protected readonly pins = inject(PinService);
  private readonly router = inject(Router);

  protected readonly repos = this.data.repos();
  protected readonly searchText = signal('');
  protected readonly allItems = computed(() => [...(this.repos.data() ?? [])].sort((a, b) => b.openIssues - a.openIssues));
  protected readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter((repo) => repo.repo.toLowerCase().includes(q) || repo.repoFull.toLowerCase().includes(q));
  });
  protected readonly pinnedItems = computed(() => this.filteredItems().filter((repo) => this.pins.isPinned('repo', repo.repoFull)));
  protected readonly unpinnedItems = computed(() => this.filteredItems().filter((repo) => !this.pins.isPinned('repo', repo.repoFull)));
  protected readonly meta = computed(() => {
    const openIssues = this.allItems().reduce((sum, repo) => sum + repo.openIssues, 0);
    const summary = `${this.allItems().length} repos · ${openIssues} open`;
    return this.repos.source()?.status ? `${summary} · ${this.repos.source()!.status}` : summary;
  });

  protected togglePinned(repo: RepoSummary): void {
    this.pins.toggle('repo', repo.repoFull);
  }

  protected openIssueFilter(repo: RepoSummary): void {
    this.router.navigate(['/issues/active'], { queryParams: { repo: repo.repo } });
  }

  protected timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return 'unknown';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
