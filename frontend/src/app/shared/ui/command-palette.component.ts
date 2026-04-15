import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ThemeService } from '../../core/theme/theme.service';
import { IssueItem, PullRequestItem, RepoSummary } from '../../models/api';
import { NavItem } from '../models/nav-item';

interface CommandPaletteItem {
  id: string;
  group: 'Actions' | 'Views' | 'Repos' | 'Issues' | 'PRs';
  title: string;
  subtitle: string;
  keywords: string;
  run: () => void;
}

@Component({
  selector: 'cc-command-palette',
  standalone: true,
  template: `
    @if (open()) {
      <div class="cc-command-palette-backdrop" (click)="close()">
        <section class="cc-command-palette-shell" (click)="$event.stopPropagation()">
          <div class="border-b border-[var(--cc-border)] px-4 py-4 sm:px-5">
            <input
              #paletteInput
              [value]="query()"
              (input)="onQueryChange($any($event.target).value)"
              (keydown)="onInputKeydown($event)"
              class="cc-command-palette-input"
              placeholder="Jump to a view, repo, issue, PR, or action..."
            />
          </div>

          @if (!flatResults().length) {
            <div class="px-5 py-10 text-center text-sm text-[var(--cc-text-soft)]">
              No commands match that search.
            </div>
          } @else {
            <div class="max-h-[70vh] overflow-y-auto px-3 py-3">
              @for (section of groupedResults(); track section.group) {
                <div class="mb-4">
                  <div class="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--cc-text-soft)]">{{ section.group }}</div>
                  <div class="space-y-1">
                    @for (item of section.items; track item.id; let idx = $index) {
                      <button
                        type="button"
                        class="cc-command-palette-item"
                        [class.cc-command-palette-item-active]="absoluteIndex(section.group, idx) === activeIndex()"
                        (mouseenter)="activeIndex.set(absoluteIndex(section.group, idx))"
                        (click)="select(item)"
                      >
                        <div class="min-w-0 flex-1 text-left">
                          <div class="truncate text-sm font-semibold text-[var(--cc-text)]">{{ item.title }}</div>
                          <div class="mt-1 truncate text-xs text-[var(--cc-text-soft)]">{{ item.subtitle }}</div>
                        </div>
                        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--cc-text-soft)]">{{ item.group }}</div>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
})
export class CommandPaletteComponent {
  readonly open = input(false);
  readonly navItems = input<NavItem[]>([]);
  readonly closed = output<void>();

  private readonly router = inject(Router);
  private readonly data = inject(DashboardDataService);
  private readonly theme = inject(ThemeService);
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('paletteInput');

  protected readonly query = signal('');
  protected readonly activeIndex = signal(0);

  private readonly navCommands = computed<CommandPaletteItem[]>(() => this.navItems().map((item) => ({
    id: `view:${item.path}`,
    group: 'Views',
    title: item.label,
    subtitle: item.path === '/' ? 'Open Home' : `Navigate to ${item.path}`,
    keywords: `${item.label} ${item.path}`.toLowerCase(),
    run: () => {
      void this.router.navigateByUrl(item.path);
    },
  })));

  private readonly actionCommands = computed<CommandPaletteItem[]>(() => [
    {
      id: 'action:refresh-all',
      group: 'Actions',
      title: 'Refresh all sources',
      subtitle: 'Kick every dashboard resource refresh now',
      keywords: 'refresh all sources reload dashboard',
      run: () => this.data.refreshAll(),
    },
    {
      id: 'action:toggle-theme',
      group: 'Actions',
      title: `Switch to ${this.theme.theme() === 'dark' ? 'light' : 'dark'} mode`,
      subtitle: 'Toggle the dashboard theme',
      keywords: 'theme dark light toggle appearance',
      run: () => this.theme.toggleTheme(),
    },
  ]);

  private readonly repoCommands = computed<CommandPaletteItem[]>(() => this.repoItems(this.query(), this.data.repos().data() ?? []));
  private readonly issueCommands = computed<CommandPaletteItem[]>(() => this.issueItems(this.query(), this.allIssues()));
  private readonly prCommands = computed<CommandPaletteItem[]>(() => this.prItems(this.query(), this.data.prs().data() ?? []));

  protected readonly flatResults = computed<CommandPaletteItem[]>(() => {
    const q = this.query().trim().toLowerCase();
    const nav = this.filterItems(this.navCommands(), q);
    const actions = this.filterItems(this.actionCommands(), q);

    if (!q) {
      return [...actions, ...nav.slice(0, 8), ...this.repoCommands().slice(0, 4), ...this.issueCommands().slice(0, 4), ...this.prCommands().slice(0, 4)];
    }

    return [...actions, ...nav, ...this.repoCommands(), ...this.issueCommands(), ...this.prCommands()];
  });

  protected readonly groupedResults = computed(() => {
    const groups: CommandPaletteItem['group'][] = ['Actions', 'Views', 'Repos', 'Issues', 'PRs'];
    return groups
      .map((group) => ({ group, items: this.flatResults().filter((item) => item.group === group) }))
      .filter((section) => section.items.length > 0);
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      this.query.set('');
      this.activeIndex.set(0);
      queueMicrotask(() => this.inputRef()?.nativeElement.focus());
    });

    effect(() => {
      const max = Math.max(0, this.flatResults().length - 1);
      if (this.activeIndex() > max) this.activeIndex.set(max);
    });
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
  }

  protected onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((index) => Math.min(index + 1, Math.max(0, this.flatResults().length - 1)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.flatResults()[this.activeIndex()];
      if (item) this.select(item);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  protected absoluteIndex(group: CommandPaletteItem['group'], indexWithinGroup: number): number {
    let offset = 0;
    for (const section of this.groupedResults()) {
      if (section.group === group) return offset + indexWithinGroup;
      offset += section.items.length;
    }
    return indexWithinGroup;
  }

  protected select(item: CommandPaletteItem): void {
    item.run();
    this.close();
  }

  protected close(): void {
    this.closed.emit();
  }

  private allIssues(): IssueItem[] {
    const data = this.data.issues().data();
    if (!data) return [];
    return [...data.urgent, ...data.active, ...data.deferred];
  }

  private filterItems(items: CommandPaletteItem[], query: string): CommandPaletteItem[] {
    if (!query) return items;
    return items.filter((item) => `${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase().includes(query));
  }

  private repoItems(query: string, repos: RepoSummary[]): CommandPaletteItem[] {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? repos.slice(0, 5)
      : repos.filter((repo) => `${repo.repo} ${repo.repoFull}`.toLowerCase().includes(q)).slice(0, 6);

    return filtered.map((repo) => ({
      id: `repo:${repo.repoFull}`,
      group: 'Repos',
      title: repo.repo,
      subtitle: `${repo.openIssues} open issues`,
      keywords: `${repo.repo} ${repo.repoFull}`.toLowerCase(),
      run: () => {
        void this.router.navigate(['/issues/active'], { queryParams: { repo: repo.repo } });
      },
    }));
  }

  private issueItems(query: string, issues: IssueItem[]): CommandPaletteItem[] {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? issues.slice(0, 5)
      : issues.filter((issue) => `${issue.title} ${issue.repo} ${issue.number}`.toLowerCase().includes(q)).slice(0, 6);

    return filtered.map((issue) => ({
      id: `issue:${issue.repoFull}#${issue.number}`,
      group: 'Issues',
      title: issue.title,
      subtitle: `${issue.repo} · #${issue.number}`,
      keywords: `${issue.title} ${issue.repo} ${issue.number} ${issue.priority}`.toLowerCase(),
      run: () => {
        if (typeof window !== 'undefined') window.open(issue.url, '_blank', 'noopener');
      },
    }));
  }

  private prItems(query: string, prs: PullRequestItem[]): CommandPaletteItem[] {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? prs.slice(0, 5)
      : prs.filter((pr) => `${pr.title} ${pr.repo} ${pr.number} ${pr.headRefName}`.toLowerCase().includes(q)).slice(0, 6);

    return filtered.map((pr) => ({
      id: `pr:${pr.repoFull}#${pr.number}`,
      group: 'PRs',
      title: pr.title,
      subtitle: `${pr.repo} · #${pr.number}`,
      keywords: `${pr.title} ${pr.repo} ${pr.number} ${pr.headRefName}`.toLowerCase(),
      run: () => {
        if (typeof window !== 'undefined') window.open(pr.url, '_blank', 'noopener');
      },
    }));
  }
}
