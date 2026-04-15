import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ThemeService } from '../../core/theme/theme.service';
import { CalendarEvent, DailyNote, DecisionNote, IssueItem, PullRequestItem, RepoSummary, StandupSummary, TaskItem } from '../../models/api';
import { NavItem } from '../models/nav-item';

type CommandGroup = 'Recent' | 'Actions' | 'Views' | 'Notes' | 'Tasks' | 'Events' | 'Repos' | 'Issues' | 'PRs';

interface CommandPaletteItem {
  id: string;
  group: CommandGroup;
  title: string;
  subtitle: string;
  keywords: string;
  icon: string;
  badge?: string;
  emptyRank: number;
  run: () => void;
}

interface CommandSection {
  group: CommandGroup;
  items: CommandPaletteItem[];
}

const RECENT_COMMANDS_KEY = 'command-center-recent-commands';
const RECENT_COMMANDS_LIMIT = 6;

@Component({
  selector: 'cc-command-palette',
  standalone: true,
  template: `
    @if (open()) {
      <div class="cc-command-palette-backdrop" (click)="close()">
        <section class="cc-command-palette-shell" (click)="$event.stopPropagation()">
          <div class="border-b border-[var(--cc-border)] px-4 py-4 sm:px-5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--cc-border)] bg-white/6 text-base text-[var(--cc-text-soft)]">⌘</div>
              <div class="min-w-0 flex-1">
                <input
                  #paletteInput
                  [value]="query()"
                  (input)="onQueryChange($any($event.target).value)"
                  (keydown)="onInputKeydown($event)"
                  class="cc-command-palette-input"
                  placeholder="Jump to a view, repo, issue, PR, or action..."
                />
                <div class="mt-1 text-xs text-[var(--cc-text-soft)]">Views, loaded GitHub objects, and quick actions in one place.</div>
              </div>
            </div>
          </div>

          @if (!flatResults().length) {
            <div class="px-5 py-10 text-center">
              <div class="text-sm font-semibold text-[var(--cc-text)]">No matches</div>
              <div class="mt-1 text-sm text-[var(--cc-text-soft)]">Try a repo name, issue number, PR branch, or page title.</div>
            </div>
          } @else {
            <div class="max-h-[68vh] overflow-y-auto px-3 py-3">
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
                        <div class="cc-command-palette-icon">{{ item.icon }}</div>
                        <div class="min-w-0 flex-1 text-left">
                          <div class="flex items-center gap-2">
                            <div class="truncate text-sm font-semibold text-[var(--cc-text)]">{{ item.title }}</div>
                            @if (item.badge) {
                              <span class="cc-command-palette-badge">{{ item.badge }}</span>
                            }
                          </div>
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

          <div class="cc-command-palette-footer">
            <span>↑ ↓ move</span>
            <span>↵ open</span>
            <span>esc close</span>
          </div>
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
  private readonly recentIds = signal<string[]>(this.readRecentIds());

  private readonly navCommands = computed<CommandPaletteItem[]>(() => this.navItems().map((item, index) => ({
    id: `view:${item.path}`,
    group: 'Views',
    title: item.label,
    subtitle: item.path === '/' ? 'Open the main dashboard' : `Navigate to ${item.path}`,
    keywords: `${item.label} ${item.path}`.toLowerCase(),
    icon: item.path === '/' ? '⌂' : '→',
    emptyRank: 300 - index,
    run: () => {
      void this.router.navigateByUrl(item.path);
    },
  })));

  private readonly actionCommands = computed<CommandPaletteItem[]>(() => {
    const actions: CommandPaletteItem[] = [
      {
        id: 'action:refresh-all',
        group: 'Actions',
        title: 'Refresh all sources',
        subtitle: 'Kick every dashboard resource refresh now',
        keywords: 'refresh all sources reload dashboard sync update',
        icon: '↻',
        badge: 'Global',
        emptyRank: 500,
        run: () => this.data.refreshAll(),
      },
      {
        id: 'action:toggle-theme',
        group: 'Actions',
        title: `Switch to ${this.theme.theme() === 'dark' ? 'light' : 'dark'} mode`,
        subtitle: 'Toggle the dashboard theme',
        keywords: 'theme dark light toggle appearance mode',
        icon: '◐',
        badge: 'Theme',
        emptyRank: 490,
        run: () => this.theme.toggleTheme(),
      },
    ];

    const query = this.query().trim().toLowerCase();
    if (!query) return actions;

    const repo = this.bestMatch(this.repoCommands(), query);
    if (repo) {
      actions.push(
        {
          id: `action:repo-active:${repo.id}`,
          group: 'Actions',
          title: `Open active issues for ${repo.title}`,
          subtitle: `Jump into the ${repo.title} active queue`,
          keywords: `${repo.title} repo active issues queue open`.toLowerCase(),
          icon: '→',
          badge: 'Repo',
          emptyRank: 470,
          run: repo.run,
        },
        {
          id: `action:repo-backlog:${repo.id}`,
          group: 'Actions',
          title: `Open backlog for ${repo.title}`,
          subtitle: `Filter the backlog view down to ${repo.title}`,
          keywords: `${repo.title} repo backlog deferred`.toLowerCase(),
          icon: '⋯',
          badge: 'Repo',
          emptyRank: 460,
          run: () => {
            void this.router.navigate(['/issues/backlog'], { queryParams: { repo: repo.title } });
          },
        },
        {
          id: `action:repo-copy:${repo.id}`,
          group: 'Actions',
          title: `Copy repo filter for ${repo.title}`,
          subtitle: 'Copy the short repo name for filtering and quick search',
          keywords: `${repo.title} repo copy filter`.toLowerCase(),
          icon: '⧉',
          badge: 'Copy',
          emptyRank: 450,
          run: () => {
            void this.copyToClipboard(repo.title);
          },
        },
      );
    }

    const issue = this.bestMatch(this.issueCommands(), query);
    if (issue) {
      actions.push(
        {
          id: `action:issue-open:${issue.id}`,
          group: 'Actions',
          title: `Open ${issue.subtitle}`,
          subtitle: issue.title,
          keywords: `${issue.title} ${issue.subtitle} open github issue`.toLowerCase(),
          icon: '!',
          badge: 'Issue',
          emptyRank: 445,
          run: issue.run,
        },
        {
          id: `action:issue-copy:${issue.id}`,
          group: 'Actions',
          title: `Copy link for ${issue.subtitle}`,
          subtitle: issue.title,
          keywords: `${issue.title} ${issue.subtitle} copy link issue`.toLowerCase(),
          icon: '⧉',
          badge: 'Copy',
          emptyRank: 440,
          run: () => {
            void this.copyToClipboard(this.objectUrl(issue.id));
          },
        },
      );
    }

    const pr = this.bestMatch(this.prCommands(), query);
    if (pr) {
      actions.push(
        {
          id: `action:pr-open:${pr.id}`,
          group: 'Actions',
          title: `Open ${pr.subtitle}`,
          subtitle: pr.title,
          keywords: `${pr.title} ${pr.subtitle} open github pr pull request`.toLowerCase(),
          icon: '⇅',
          badge: 'PR',
          emptyRank: 435,
          run: pr.run,
        },
        {
          id: `action:pr-copy:${pr.id}`,
          group: 'Actions',
          title: `Copy link for ${pr.subtitle}`,
          subtitle: pr.title,
          keywords: `${pr.title} ${pr.subtitle} copy link pr pull request`.toLowerCase(),
          icon: '⧉',
          badge: 'Copy',
          emptyRank: 430,
          run: () => {
            void this.copyToClipboard(this.objectUrl(pr.id));
          },
        },
      );
    }

    return actions;
  });

  private readonly noteCommands = computed<CommandPaletteItem[]>(() => this.noteItems(this.data.notes().data()?.dailyNote ?? null, this.data.notes().data()?.decisions ?? [], this.data.standup().data()));
  private readonly taskCommands = computed<CommandPaletteItem[]>(() => this.taskItems(this.data.tasks().data()?.open ?? []));
  private readonly eventCommands = computed<CommandPaletteItem[]>(() => this.eventItems(this.data.calendar().data() ?? []));
  private readonly repoCommands = computed<CommandPaletteItem[]>(() => this.repoItems(this.data.repos().data() ?? []));
  private readonly issueCommands = computed<CommandPaletteItem[]>(() => this.issueItems(this.allIssues()));
  private readonly prCommands = computed<CommandPaletteItem[]>(() => this.prItems(this.data.prs().data() ?? []));
  private readonly allCommands = computed<CommandPaletteItem[]>(() => [
    ...this.actionCommands(),
    ...this.navCommands(),
    ...this.noteCommands(),
    ...this.taskCommands(),
    ...this.eventCommands(),
    ...this.repoCommands(),
    ...this.issueCommands(),
    ...this.prCommands(),
  ]);
  private readonly recentCommands = computed<CommandPaletteItem[]>(() => {
    const byId = new Map(this.allCommands().map((item) => [item.id, item]));
    return this.recentIds()
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((item) => ({
        ...item!,
        group: 'Recent' as const,
        badge: item!.badge || 'Recent',
        emptyRank: 800,
      }));
  });

  protected readonly flatResults = computed<CommandPaletteItem[]>(() => {
    const q = this.query().trim().toLowerCase();
    const items = q ? this.allCommands() : [...this.recentCommands(), ...this.allCommands()];

    return items
      .map((item) => ({ item, score: this.scoreItem(item, q) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, q ? 18 : 14)
      .map((entry) => entry.item);
  });

  protected readonly groupedResults = computed<CommandSection[]>(() => {
    const groups: CommandGroup[] = ['Recent', 'Actions', 'Views', 'Notes', 'Tasks', 'Events', 'Repos', 'Issues', 'PRs'];
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

  protected absoluteIndex(group: CommandGroup, indexWithinGroup: number): number {
    let offset = 0;
    for (const section of this.groupedResults()) {
      if (section.group === group) return offset + indexWithinGroup;
      offset += section.items.length;
    }
    return indexWithinGroup;
  }

  protected select(item: CommandPaletteItem): void {
    this.rememberCommand(item.id);
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

  private scoreItem(item: CommandPaletteItem, query: string): number {
    if (!query) return item.emptyRank;

    const haystack = `${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase();
    const title = item.title.toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    if (!tokens.length) return item.emptyRank;

    let score = 0;
    for (const token of tokens) {
      if (title === token) score += 120;
      else if (title.startsWith(token)) score += 70;
      else if (title.includes(token)) score += 40;
      else if (haystack.includes(token)) score += 18;
      else return 0;
    }

    if (haystack.includes(query)) score += 30;
    if (this.recentIds().includes(item.id)) score += 24;
    return score + item.emptyRank / 10;
  }

  private readRecentIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(RECENT_COMMANDS_KEY);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string').slice(0, RECENT_COMMANDS_LIMIT) : [];
    } catch {
      return [];
    }
  }

  private rememberCommand(id: string): void {
    const next = [id, ...this.recentIds().filter((value) => value !== id)].slice(0, RECENT_COMMANDS_LIMIT);
    this.recentIds.set(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(next));
    } catch {
      // ignore localStorage failures
    }
  }

  private bestMatch(items: CommandPaletteItem[], query: string): CommandPaletteItem | null {
    return items
      .map((item) => ({ item, score: this.scoreItem(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.item ?? null;
  }

  private objectUrl(id: string): string {
    const [, repoAndNumber] = id.split(':');
    if (!repoAndNumber) return '';
    const [repoFull, number] = repoAndNumber.split('#');
    if (!repoFull || !number) return '';
    return `https://github.com/${repoFull}/${id.startsWith('pr:') ? 'pull' : 'issues'}/${number}`;
  }

  private async copyToClipboard(value: string): Promise<void> {
    if (!value || typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(value);
  }

  private noteItems(dailyNote: DailyNote | null, decisions: DecisionNote[], standup: StandupSummary | null): CommandPaletteItem[] {
    const items: CommandPaletteItem[] = [];

    if (dailyNote) {
      items.push({
        id: `note:daily:${dailyNote.date}`,
        group: 'Notes',
        title: dailyNote.isToday ? 'Daily note (today)' : `Daily note · ${dailyNote.date}`,
        subtitle: dailyNote.preview || dailyNote.date,
        keywords: `${dailyNote.date} daily note journal today ${dailyNote.preview}`.toLowerCase(),
        icon: '✎',
        badge: dailyNote.isToday ? 'Today' : 'Daily',
        emptyRank: dailyNote.isToday ? 260 : 230,
        run: () => {
          void this.router.navigateByUrl('/notes');
        },
      });
    }

    for (const decision of decisions.slice(0, 6)) {
      items.push({
        id: `note:decision:${decision.title}`,
        group: 'Notes',
        title: decision.title,
        subtitle: `${decision.date}${decision.status ? ` · ${decision.status}` : ''}`,
        keywords: `${decision.title} ${decision.date} decision note ${decision.status || ''} ${decision.preview}`.toLowerCase(),
        icon: '◆',
        badge: decision.status || 'Decision',
        emptyRank: 220,
        run: () => {
          void this.router.navigateByUrl('/notes');
        },
      });
    }

    if (standup) {
      items.push({
        id: `note:standup:${standup.date}`,
        group: 'Notes',
        title: standup.title,
        subtitle: `${standup.sections.length} repo section${standup.sections.length === 1 ? '' : 's'}`,
        keywords: `${standup.title} ${standup.date} standup status ${standup.sections.map((section) => section.repo).join(' ')}`.toLowerCase(),
        icon: '☰',
        badge: standup.isToday ? 'Today' : 'Standup',
        emptyRank: standup.isToday ? 250 : 225,
        run: () => {
          void this.router.navigateByUrl('/notes');
        },
      });
    }

    return items;
  }

  private taskItems(tasks: TaskItem[]): CommandPaletteItem[] {
    return tasks.slice(0, 8).map((task) => ({
      id: `task:${task.title}:${task.source}`,
      group: 'Tasks',
      title: task.title,
      subtitle: `${task.source}${task.section ? ` · ${task.section}` : ''}${task.due ? ` · due ${task.due}` : ''}`,
      keywords: `${task.title} ${task.source} ${task.section || ''} ${task.due || ''} task open`.toLowerCase(),
      icon: '✓',
      badge: task.due ? 'Due' : 'Task',
      emptyRank: task.due ? 215 : 205,
      run: () => {
        void this.router.navigateByUrl('/tasks');
      },
    }));
  }

  private eventItems(events: CalendarEvent[]): CommandPaletteItem[] {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.start).getTime() >= now)
      .slice(0, 8)
      .map((event) => ({
        id: `event:${event.start}:${event.title}`,
        group: 'Events',
        title: event.title,
        subtitle: `${this.eventDateLabel(event)} · ${this.eventTimeLabel(event)} · ${event.calendar}`,
        keywords: `${event.title} ${event.calendar} ${event.location || ''} event calendar ${event.start}`.toLowerCase(),
        icon: '◷',
        badge: event.allDay ? 'All day' : 'Upcoming',
        emptyRank: 210,
        run: () => {
          void this.router.navigateByUrl('/calendar');
        },
      }));
  }

  private repoItems(repos: RepoSummary[]): CommandPaletteItem[] {
    return repos.map((repo) => ({
      id: `repo:${repo.repoFull}`,
      group: 'Repos',
      title: repo.repo,
      subtitle: `${repo.repoFull} · ${repo.openIssues} open issues`,
      keywords: `${repo.repo} ${repo.repoFull} repository issues backlog`.toLowerCase(),
      icon: '□',
      badge: repo.archived ? 'Archived' : repo.tracked ? 'Tracked' : undefined,
      emptyRank: 200 + Math.min(repo.openIssues, 20),
      run: () => {
        void this.router.navigate(['/issues/active'], { queryParams: { repo: repo.repo } });
      },
    }));
  }

  private issueItems(issues: IssueItem[]): CommandPaletteItem[] {
    return issues.map((issue) => ({
      id: `issue:${issue.repoFull}#${issue.number}`,
      group: 'Issues',
      title: issue.title,
      subtitle: `${issue.repo} · #${issue.number}`,
      keywords: `${issue.title} ${issue.repo} ${issue.repoFull} ${issue.number} ${issue.priority} issue`.toLowerCase(),
      icon: '!',
      badge: issue.priority,
      emptyRank: issue.priority === 'urgent' ? 180 : issue.priority === 'active' ? 150 : 120,
      run: () => {
        if (typeof window !== 'undefined') window.open(issue.url, '_blank', 'noopener');
      },
    }));
  }

  private eventDateLabel(event: CalendarEvent): string {
    return new Date(event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private eventTimeLabel(event: CalendarEvent): string {
    if (event.allDay) return 'all day';
    return new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  private prItems(prs: PullRequestItem[]): CommandPaletteItem[] {
    return prs.map((pr) => ({
      id: `pr:${pr.repoFull}#${pr.number}`,
      group: 'PRs',
      title: pr.title,
      subtitle: `${pr.repo} · #${pr.number} · ${pr.headRefName}`,
      keywords: `${pr.title} ${pr.repo} ${pr.repoFull} ${pr.number} ${pr.headRefName} pull request`.toLowerCase(),
      icon: pr.isDraft ? '◌' : '⇅',
      badge: pr.reviewDecision || (pr.isDraft ? 'Draft' : 'Open'),
      emptyRank: pr.reviewDecision === 'CHANGES_REQUESTED' ? 175 : pr.reviewDecision === 'REVIEW_REQUIRED' ? 165 : 130,
      run: () => {
        if (typeof window !== 'undefined') window.open(pr.url, '_blank', 'noopener');
      },
    }));
  }
}
