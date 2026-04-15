import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { HomeLayoutService } from '../../core/state/home-layout.service';
import { PinService } from '../../core/state/pin.service';
import { ReminderItem, RemindersService } from '../../core/state/reminders.service';
import { CalendarEvent, IssueItem, PullRequestItem, RepoSummary, TaskItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { PanelAction } from '../../shared/models/panel-action';
import { CardComponent } from '../../shared/ui/card.component';
import { PanelActionsComponent } from '../../shared/ui/panel-actions.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';
import { TrendBarsComponent } from '../../shared/ui/trend-bars.component';

interface PinnedHomeItem {
  type: 'Issue' | 'PR' | 'Task' | 'Event' | 'Repo';
  title: string;
  meta: string;
  externalUrl?: string;
  route?: string;
  unpin: () => void;
}

@Component({
  selector: 'app-home-page',
  imports: [ViewShellComponent, CardComponent, PanelActionsComponent, PillComponent, StatePanelComponent, TrendBarsComponent],
  template: `
    <app-view-shell
      eyebrow="Overview"
      title="Home"
      subtitle="Your daily command-center view, including reminders, pinned items, upcoming events, issue and task summaries, the latest daily note, and standup context."
      [meta]="homeMeta()"
    >
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button type="button" (click)="refreshAll()" [disabled]="refreshingAll()" class="cc-action-button disabled:cursor-not-allowed disabled:opacity-60">
          {{ refreshingAll() ? 'Refreshing…' : 'Refresh sources' }}
        </button>
      </div>

      <cc-card eyebrow="Today" title="command.center" [description]="tagline()" tone="highlight" [compact]="true">
        <section class="grid gap-4 lg:grid-cols-6">
          <button type="button" (click)="go('/issues/urgent')" class="cc-card-button p-5 text-left">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">Urgent</div>
            <div class="mt-3 text-3xl font-semibold text-rose-300">{{ issues.data()?.counts?.urgent ?? 0 }}</div>
            <div class="mt-3 flex items-end gap-3">
              <cc-trend-bars [values]="urgentIssueTrend()" tone="rose"></cc-trend-bars>
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">7d new issues</div>
            </div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">bugs and critical work</div>
          </button>
          <button type="button" (click)="go('/issues/active')" class="cc-card-button p-5 text-left">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">Active</div>
            <div class="mt-3 text-3xl font-semibold text-amber-300">{{ issues.data()?.counts?.active ?? 0 }}</div>
            <div class="mt-3 flex items-end gap-3">
              <cc-trend-bars [values]="activeIssueTrend()" tone="amber"></cc-trend-bars>
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">7d new issues</div>
            </div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">in-progress issues</div>
          </button>
          <button type="button" (click)="go('/issues/backlog')" class="cc-card-button p-5 text-left">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">Backlog</div>
            <div class="mt-3 text-3xl font-semibold text-slate-300">{{ issues.data()?.counts?.deferred ?? 0 }}</div>
            <div class="mt-3 flex items-end gap-3">
              <cc-trend-bars [values]="backlogIssueTrend()" tone="slate"></cc-trend-bars>
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">7d new issues</div>
            </div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ issues.data()?.total ?? 0 }} total open</div>
          </button>
          <button type="button" (click)="go('/tasks')" class="cc-card-button p-5 text-left">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">Tasks</div>
            <div class="mt-3 text-3xl font-semibold text-fuchsia-300">{{ tasks.data()?.open?.length ?? 0 }}</div>
            <div class="mt-3 flex items-end gap-3">
              <cc-trend-bars [values]="taskCompletionTrend()" tone="fuchsia"></cc-trend-bars>
              <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">7d completions</div>
            </div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">open in Obsidian</div>
          </button>
          <button type="button" (click)="go('/infra')" class="cc-card-button p-5 text-left">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">Infra</div>
            @if (infra.hasData()) {
              <div class="mt-3 text-3xl font-semibold text-emerald-300">{{ onlineServices() }}<span class="text-base font-medium text-[var(--cc-text-soft)]">/{{ infra.data()?.length ?? 0 }}</span></div>
              <div class="mt-2 text-sm text-[var(--cc-text-muted)]">services online</div>
            } @else {
              <div class="mt-3 text-3xl font-semibold text-[var(--cc-text-soft)]">—</div>
              <div class="mt-2 text-sm text-[var(--cc-text-muted)]">monitoring unavailable</div>
            }
          </button>
          <button type="button" (click)="go('/openclaw')" class="cc-card-button p-5 text-left">
            <div class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--cc-text-soft)]">OpenClaw</div>
            @if (openClaw.hasData()) {
              <div class="mt-3 text-3xl font-semibold" [class.text-emerald-300]="openClawGatewayReachable()" [class.text-amber-300]="!openClawGatewayReachable()">{{ openClawGatewayReachable() ? 'OK' : 'WARN' }}</div>
              <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ openClawSummary() }}</div>
            } @else {
              <div class="mt-3 text-3xl font-semibold text-[var(--cc-text-soft)]">—</div>
              <div class="mt-2 text-sm text-[var(--cc-text-muted)]">runtime unavailable</div>
            }
          </button>
        </section>
      </cc-card>

      <cc-card eyebrow="Reminders" title="Keep the little stuff visible" [compact]="true">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm text-[var(--cc-text-muted)]">Quick capture for things you do not want falling through the cracks.</p>
          </div>
          <button type="button" (click)="openReminderComposer()" class="cc-action-button">＋ Add</button>
        </div>

        @if (composerOpen()) {
          <div class="cc-list-card mt-4 grid gap-3 p-4 md:grid-cols-[1fr_180px_auto_auto]">
            <input [value]="reminderText()" (input)="reminderText.set($any($event.target).value)" (keydown)="onReminderKeydown($event)" class="cc-input rounded-xl px-4 py-3 text-sm" placeholder="What do you need to remember?" />
            <input [value]="reminderDue() || ''" (input)="reminderDue.set($any($event.target).value || null)" type="date" class="cc-input rounded-xl px-4 py-3 text-sm" />
            <button type="button" (click)="saveReminder()" class="cc-small-button cc-small-button-accent rounded-xl px-4 py-3 text-sm">{{ editingReminderId() ? 'Save' : 'Add' }}</button>
            <button type="button" (click)="cancelReminderEdit()" class="cc-small-button rounded-xl px-4 py-3 text-sm">Cancel</button>
          </div>
        }

        <div class="mt-4 space-y-3">
          @if (!reminders.items().length) {
            <cc-state-panel kind="empty" title="No reminders yet" message="Add one above, or press N while on Home to capture a quick reminder."></cc-state-panel>
          } @else {
            @for (reminder of reminders.items(); track reminder.id) {
              <div class="cc-list-card flex items-center gap-3 px-4 py-3">
                <button type="button" (click)="completeReminder(reminder.id)" class="h-5 w-5 rounded-full border border-[var(--cc-border)]"></button>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-[var(--cc-text)]">{{ reminder.text }}</div>
                  @if (reminder.due) {
                    <div class="mt-1 text-xs text-[var(--cc-text-soft)]">📅 {{ reminder.due }}</div>
                  }
                </div>
                <button type="button" (click)="editReminder(reminder)" class="cc-small-button">Edit</button>
                <button type="button" (click)="dismissReminder(reminder.id)" class="cc-small-button cc-small-button-danger">Dismiss</button>
              </div>
            }
          }
        </div>
      </cc-card>

      <section class="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 md:p-7">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div class="text-sm font-semibold text-[var(--cc-text)]">Home layout</div>
            <div class="mt-2 text-sm text-[var(--cc-text-muted)]">{{ layoutSummary() }}</div>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" (click)="homeLayout.toggleCompact()" class="cc-action-button">{{ homeLayout.layout().compact ? 'Compact on' : 'Compact mode' }}</button>
            <button type="button" (click)="homeLayout.toggleCustomize()" class="cc-action-button">{{ homeLayout.customizeMode() ? 'Done customizing' : 'Customize' }}</button>
            <button type="button" (click)="homeLayout.reset()" class="cc-action-button">Reset layout</button>
          </div>
        </div>

        @if (hiddenSections().length) {
          <div class="mt-4 flex flex-wrap gap-2">
            @for (sectionId of hiddenSections(); track sectionId) {
              <button type="button" (click)="homeLayout.restore(sectionId)" class="cc-small-button">Show {{ sectionLabel(sectionId) }}</button>
            }
          </div>
        }
      </section>

      <section class="grid gap-6" [class.lg:grid-cols-3]="!homeLayout.layout().compact" [class.lg:grid-cols-2]="homeLayout.layout().compact">
        @for (sectionId of homeLayout.layout().order; track sectionId; let index = $index) {
          @if (!isSectionHidden(sectionId)) {
            <article class="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 md:p-7" [class.lg:col-span-3]="sectionId === 'pinned' || sectionId === 'daily-note' || sectionId === 'standup'" [class.opacity-90]="homeLayout.layout().compact">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-lg font-semibold tracking-tight text-[var(--cc-text)]">{{ sectionLabel(sectionId) }}</div>
                </div>
                <div class="flex flex-wrap justify-end gap-2">
                  @if (panelActions(sectionId).length) {
                    <cc-panel-actions [actions]="panelActions(sectionId)" (actionSelected)="onPanelAction(sectionId, $event)"></cc-panel-actions>
                  }
                  <button type="button" (click)="homeLayout.toggleCollapsed(sectionId)" class="cc-small-button">{{ isSectionCollapsed(sectionId) ? 'Expand' : 'Collapse' }}</button>
                  @if (homeLayout.customizeMode()) {
                    <button type="button" (click)="homeLayout.pinToTop(sectionId)" class="cc-small-button">Top</button>
                    <button type="button" (click)="homeLayout.move(sectionId, -1)" [disabled]="index === 0" class="cc-small-button disabled:opacity-50">↑</button>
                    <button type="button" (click)="homeLayout.move(sectionId, 1)" [disabled]="index === homeLayout.layout().order.length - 1" class="cc-small-button disabled:opacity-50">↓</button>
                    <button type="button" (click)="homeLayout.toggleHidden(sectionId)" class="cc-small-button">Hide</button>
                  }
                </div>
              </div>

              @if (!isSectionCollapsed(sectionId)) {
                <div class="mt-5">
                  @switch (sectionId) {
                    @case ('pinned') {
                      @if (!pinnedHomeItems().length) {
                        <cc-state-panel kind="empty" title="Nothing pinned yet" message="Pin an issue, PR, task, event, or repo to keep it at the top of Home."></cc-state-panel>
                      } @else {
                        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          @for (item of pinnedHomeItems(); track item.type + ':' + item.title + ':' + item.meta) {
                            <div class="cc-list-card p-4">
                              <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0 flex-1">
                                  <div class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{{ item.type }}</div>
                                  <div class="mt-2 truncate text-sm font-semibold text-[var(--cc-text)]">{{ item.title }}</div>
                                  <div class="mt-2 text-xs leading-5 text-[var(--cc-text-soft)]">{{ item.meta }}</div>
                                </div>
                                <button type="button" (click)="item.unpin()" class="cc-small-button cc-small-button-danger">×</button>
                              </div>
                              @if (item.externalUrl) {
                                <a [href]="item.externalUrl" target="_blank" class="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Open</a>
                              } @else if (item.route) {
                                <button type="button" (click)="go(item.route)" class="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Open</button>
                              }
                            </div>
                          }
                        </div>
                      }
                    }
                    @case ('upcoming') {
                      @if (calendar.isLoading()) {
                        <cc-state-panel kind="loading" title="Loading upcoming events" message="Reading the current calendar window for the Home dashboard."></cc-state-panel>
                      } @else if (calendar.isUnavailable()) {
                        <cc-state-panel kind="unavailable" title="Calendar unavailable" [message]="calendar.error() || 'Upcoming events could not be loaded.'"></cc-state-panel>
                      } @else if (!upcomingEvents().length) {
                        <cc-state-panel kind="empty" title="No upcoming events" message="Nothing is scheduled in the current window."></cc-state-panel>
                      } @else {
                        <div class="space-y-3">
                          @for (event of upcomingEvents(); track eventKey(event)) {
                            <div class="cc-list-card p-4">
                              <div class="flex items-start justify-between gap-3">
                                <div>
                                  <div class="text-sm font-semibold text-[var(--cc-text)]">{{ event.title }}</div>
                                  <div class="mt-2 text-xs leading-5 text-[var(--cc-text-soft)]">{{ eventDateLabel(event) }} · {{ eventTimeLabel(event) }} · {{ event.calendar }}</div>
                                </div>
                                <button type="button" (click)="togglePinnedEvent(event)" class="cc-small-button">{{ pins.isPinned('event', eventKey(event)) ? 'Unpin' : 'Pin' }}</button>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    }
                    @case ('issues') {
                      @if (issues.isLoading()) {
                        <cc-state-panel kind="loading" title="Loading recent issues" message="Reading urgent and active issues for the Home dashboard."></cc-state-panel>
                      } @else if (issues.isUnavailable()) {
                        <cc-state-panel kind="unavailable" title="Issues unavailable" [message]="issues.error() || 'Issue data could not be loaded.'"></cc-state-panel>
                      } @else if (!homeIssues().length) {
                        <cc-state-panel kind="empty" title="No urgent issues" message="The urgent queue is clear right now."></cc-state-panel>
                      } @else {
                        <div class="space-y-3">
                          @for (issue of homeIssues(); track issueKey(issue)) {
                            <div class="cc-list-card p-4">
                              <div class="flex items-start justify-between gap-3">
                                <div>
                                  <div class="text-sm font-semibold text-[var(--cc-text)]">{{ issue.title }}</div>
                                  <div class="mt-2 text-xs leading-5 text-[var(--cc-text-soft)]">{{ issue.repo }} · #{{ issue.number }} · {{ timeAgo(issue.createdAt) }}</div>
                                </div>
                                <div class="flex items-center gap-2">
                                  <button type="button" (click)="togglePinnedIssue(issue)" class="cc-small-button">{{ pins.isPinned('issue', issueKey(issue)) ? 'Unpin' : 'Pin' }}</button>
                                  <button type="button" (click)="go('/issues/' + issueRoute(issue.priority))" class="cc-small-button cc-small-button-accent">View</button>
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    }
                    @case ('tasks') {
                      @if (tasks.isLoading()) {
                        <cc-state-panel kind="loading" title="Loading open tasks" message="Reading current open tasks for the Home dashboard."></cc-state-panel>
                      } @else if (tasks.isUnavailable()) {
                        <cc-state-panel kind="unavailable" title="Tasks unavailable" [message]="tasks.error() || 'Open tasks could not be loaded.'"></cc-state-panel>
                      } @else if (!homeTasks().length) {
                        <cc-state-panel kind="empty" title="All done" message="There are no open tasks to show here."></cc-state-panel>
                      } @else {
                        <div class="space-y-3">
                          @for (task of homeTasks(); track taskKey(task)) {
                            <div class="cc-list-card p-4">
                              <div class="flex items-start justify-between gap-3">
                                <div>
                                  <div class="text-sm font-semibold text-[var(--cc-text)]">{{ task.title }}</div>
                                  <div class="mt-2 text-xs leading-5 text-[var(--cc-text-soft)]">
                                    {{ task.source }}
                                    @if (task.section) { · {{ task.section }} }
                                    @if (task.due) { · 📅 {{ task.due }} }
                                  </div>
                                </div>
                                <button type="button" (click)="togglePinnedTask(task)" class="cc-small-button">{{ pins.isPinned('task', taskKey(task)) ? 'Unpin' : 'Pin' }}</button>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    }
                    @case ('daily-note') {
                      @if (notes.isLoading()) {
                        <cc-state-panel kind="loading" title="Loading daily note" message="Reading the latest daily note for the Home dashboard."></cc-state-panel>
                      } @else if (notes.isUnavailable()) {
                        <cc-state-panel kind="unavailable" title="Daily note unavailable" [message]="notes.error() || 'The latest daily note could not be loaded.'"></cc-state-panel>
                      } @else if (!notes.data()?.dailyNote) {
                        <cc-state-panel kind="empty" title="No recent daily note" message="No recent daily note was found in the configured Obsidian paths."></cc-state-panel>
                      } @else {
                        <div class="cc-list-card p-5">
                          <div class="flex items-center justify-between gap-4">
                            <div class="text-sm font-semibold text-[var(--cc-text)]">{{ notes.data()!.dailyNote!.date }}</div>
                            <cc-pill tone="info">{{ notes.data()!.dailyNote!.isToday ? 'Today' : 'Most recent' }}</cc-pill>
                          </div>
                          <p class="mt-4 text-sm leading-7 text-[var(--cc-text-muted)]">{{ notes.data()!.dailyNote!.preview || 'No content' }}</p>
                        </div>
                      }
                    }
                    @case ('standup') {
                      @if (standup.isLoading()) {
                        <cc-state-panel kind="loading" title="Loading standup" message="Reading the latest standup summary for the Home dashboard."></cc-state-panel>
                      } @else if (standup.isUnavailable()) {
                        <cc-state-panel kind="unavailable" title="Standup unavailable" [message]="standup.error() || 'The latest standup could not be loaded.'"></cc-state-panel>
                      } @else if (!standup.data()) {
                        <cc-state-panel kind="empty" title="No standup yet" message="A recent standup has not been loaded yet."></cc-state-panel>
                      } @else {
                        <div class="space-y-4">
                          <div class="flex items-center justify-between gap-4">
                            <div class="text-sm font-semibold text-[var(--cc-text)]">{{ standup.data()!.title }}</div>
                            <cc-pill tone="info">{{ standup.data()!.isToday ? 'Today' : standup.data()!.date }}</cc-pill>
                          </div>
                          @for (section of standup.data()!.sections; track section.repo) {
                            <div class="cc-list-card p-4">
                              <div class="flex items-center justify-between gap-3">
                                <div class="text-sm font-semibold text-[var(--cc-text)]">{{ section.repo }}</div>
                                <div class="text-xs text-[var(--cc-text-soft)]">{{ section.stats }}</div>
                              </div>
                              <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--cc-text-muted)]">
                                @for (bullet of section.bullets; track bullet) {
                                  <li>{{ cleanedBullet(bullet) }}</li>
                                }
                              </ul>
                            </div>
                          }
                        </div>
                      }
                    }
                  }
                </div>
              }
            </article>
          }
        }
      </section>
    </app-view-shell>
  `,
})
export class HomePage {
  protected readonly data = inject(DashboardDataService);
  protected readonly pins = inject(PinService);
  protected readonly homeLayout = inject(HomeLayoutService);
  protected readonly reminders = inject(RemindersService);
  private readonly router = inject(Router);

  protected readonly issues = this.data.issues();
  protected readonly prs = this.data.prs();
  protected readonly tasks = this.data.tasks();
  protected readonly calendar = this.data.calendar();
  protected readonly notes = this.data.notes();
  protected readonly standup = this.data.standup();
  protected readonly infra = this.data.infra();
  protected readonly openClaw = this.data.openClaw();
  protected readonly repos = this.data.repos();
  protected readonly refreshingAll = this.data.refreshingAll;

  protected readonly composerOpen = signal(false);
  protected readonly editingReminderId = signal<string | null>(null);
  protected readonly reminderText = signal('');
  protected readonly reminderDue = signal<string | null>(null);
  protected readonly copiedPanel = signal<string | null>(null);

  protected readonly onlineServices = computed(() => (this.infra.data() ?? []).filter((process) => process.status === 'online').length);
  protected readonly openClawGatewayReachable = computed(() => Boolean(this.openClaw.data()?.gateway?.reachable));
  protected readonly openClawSummary = computed(() => {
    const data = this.openClaw.data();
    if (!data) return 'runtime unavailable';
    const service = data.gatewayService?.runtime?.status || 'unknown service';
    const liveSessions = (data.activeSessions ?? []).filter((session) => session.active).length;
    return `${service} · ${liveSessions} live sessions`;
  });
  protected readonly upcomingEvents = computed(() => {
    return (this.calendar.data() ?? [])
      .filter((event) => new Date(event.start) > new Date())
      .slice(0, 3);
  });
  protected readonly homeIssues = computed(() => {
    const data = this.issues.data();
    if (!data) return [] as IssueItem[];
    const allIssues = [...data.urgent, ...data.active, ...data.deferred];
    const pinned = allIssues.filter((issue) => this.pins.isPinned('issue', this.issueKey(issue)));
    const recent = [...data.urgent, ...data.active]
      .filter((issue) => !this.pins.isPinned('issue', this.issueKey(issue)))
      .slice(0, 4);
    return [...pinned, ...recent].slice(0, 6);
  });
  protected readonly homeTasks = computed(() => (this.tasks.data()?.open ?? []).slice(0, 4));
  protected readonly urgentIssueTrend = computed(() => this.dailyCountTrend((this.issues.data()?.urgent ?? []).map((issue) => issue.createdAt)));
  protected readonly activeIssueTrend = computed(() => this.dailyCountTrend((this.issues.data()?.active ?? []).map((issue) => issue.createdAt)));
  protected readonly backlogIssueTrend = computed(() => this.dailyCountTrend((this.issues.data()?.deferred ?? []).map((issue) => issue.createdAt)));
  protected readonly taskCompletionTrend = computed(() => this.dailyCountTrend((this.tasks.data()?.completed ?? []).map((task) => task.completedAt).filter(Boolean) as string[]));
  protected readonly hiddenSections = computed(() => this.homeLayout.layout().hidden);
  protected readonly pinnedHomeItems = computed<PinnedHomeItem[]>(() => {
    const items: PinnedHomeItem[] = [];

    const issueData = this.issues.data();
    if (issueData) {
      [...issueData.urgent, ...issueData.active, ...issueData.deferred]
        .filter((issue) => this.pins.isPinned('issue', this.issueKey(issue)))
        .forEach((issue) => items.push({
          type: 'Issue',
          title: issue.title,
          meta: `${issue.repo} · #${issue.number}`,
          externalUrl: issue.url,
          unpin: () => this.togglePinnedIssue(issue),
        }));
    }

    (this.prs.data() ?? [])
      .filter((pr) => this.pins.isPinned('pr', this.prKey(pr)))
      .forEach((pr) => items.push({
        type: 'PR',
        title: pr.title,
        meta: `${pr.repo} · #${pr.number}${pr.isDraft ? ' · Draft' : ''}`,
        externalUrl: pr.url,
        unpin: () => this.togglePinnedPr(pr),
      }));

    (this.tasks.data()?.open ?? [])
      .filter((task) => this.pins.isPinned('task', this.taskKey(task)))
      .forEach((task) => items.push({
        type: 'Task',
        title: task.title,
        meta: `${task.source}${task.section ? ' · ' + task.section : ''}${task.due ? ' · 📅 ' + task.due : ''}`,
        route: '/tasks',
        unpin: () => this.togglePinnedTask(task),
      }));

    (this.calendar.data() ?? [])
      .filter((event) => this.pins.isPinned('event', this.eventKey(event)))
      .forEach((event) => items.push({
        type: 'Event',
        title: event.title,
        meta: `${this.eventDateLabel(event)} · ${event.calendar}`,
        route: '/calendar',
        unpin: () => this.togglePinnedEvent(event),
      }));

    (this.repos.data() ?? [])
      .filter((repo) => this.pins.isPinned('repo', repo.repoFull))
      .forEach((repo) => items.push({
        type: 'Repo',
        title: repo.repo,
        meta: `${repo.openIssues} open issues`,
        externalUrl: `https://github.com/${repo.repoFull}/issues`,
        unpin: () => this.togglePinnedRepo(repo),
      }));

    return items;
  });
  protected readonly homeMeta = computed(() => {
    const urgent = this.issues.data()?.counts.urgent ?? 0;
    const tasks = this.tasks.data()?.open.length ?? 0;
    return `${urgent} urgent · ${tasks} open tasks`;
  });
  protected readonly tagline = computed(() => {
    const urgent = this.issues.data()?.counts.urgent ?? 0;
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });
    return urgent > 0 ? `${date} · ${urgent} urgent issue${urgent === 1 ? '' : 's'} need attention` : `${date} · All clear`;
  });
  protected readonly layoutSummary = computed(() => {
    const bits = [] as string[];
    bits.push(this.homeLayout.layout().compact ? 'Compact mode is on.' : 'Standard density.');
    if (this.homeLayout.layout().hidden.length) bits.push(`${this.homeLayout.layout().hidden.length} hidden section${this.homeLayout.layout().hidden.length === 1 ? '' : 's'}.`);
    if (this.homeLayout.customizeMode()) bits.push('Customize mode is on.');
    return bits.join(' ');
  });

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    if (event.key.toLowerCase() !== 'n') return;
    event.preventDefault();
    this.openReminderComposer();
  }

  protected refreshAll(): void {
    this.data.refreshAll();
  }

  protected panelActions(sectionId: string): PanelAction[] {
    const route = this.panelRoute(sectionId);
    const copied = this.copiedPanel() === sectionId;

    const actions: PanelAction[] = [];
    if (route) actions.push({ id: 'open', label: 'Open', icon: '↗' });
    if (this.canRefreshPanel(sectionId)) actions.push({ id: 'refresh', label: 'Refresh', icon: '↻', tone: 'accent' });
    if (route) actions.push({ id: 'copy', label: copied ? 'Copied' : 'Copy link', icon: '⧉' });
    return actions;
  }

  protected onPanelAction(sectionId: string, actionId: string): void {
    if (actionId === 'open') {
      const route = this.panelRoute(sectionId);
      if (route) this.go(route);
      return;
    }

    if (actionId === 'refresh') {
      this.refreshPanel(sectionId);
      return;
    }

    if (actionId === 'copy') {
      void this.copyPanelLink(sectionId);
    }
  }

  protected go(path: string): void {
    this.router.navigateByUrl(path);
  }

  private dailyCountTrend(values: string[], days = 7): number[] {
    const buckets = Array.from({ length: days }, () => 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const value of values) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) continue;
      date.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
      if (diff < 0 || diff >= days) continue;
      buckets[days - diff - 1] += 1;
    }

    return buckets;
  }

  protected sectionLabel(sectionId: string): string {
    return {
      pinned: 'Pinned',
      upcoming: 'Upcoming',
      issues: 'Recent Issues',
      tasks: 'Open Tasks',
      'daily-note': 'Daily Note',
      standup: 'Latest Standup',
    }[sectionId] || sectionId;
  }

  protected isSectionCollapsed(sectionId: string): boolean {
    return this.homeLayout.layout().collapsed.includes(sectionId);
  }

  protected isSectionHidden(sectionId: string): boolean {
    return this.homeLayout.layout().hidden.includes(sectionId) || (sectionId === 'pinned' && !this.homeLayout.customizeMode() && this.pinnedHomeItems().length === 0);
  }

  protected panelRoute(sectionId: string): string | null {
    return {
      upcoming: '/calendar',
      issues: '/issues/urgent',
      tasks: '/tasks',
      'daily-note': '/notes',
      standup: '/notes',
      pinned: null,
    }[sectionId] ?? null;
  }

  protected canRefreshPanel(sectionId: string): boolean {
    return ['upcoming', 'issues', 'tasks', 'daily-note', 'standup'].includes(sectionId);
  }

  protected refreshPanel(sectionId: string): void {
    if (sectionId === 'upcoming') this.calendar.refresh();
    if (sectionId === 'issues') this.issues.refresh();
    if (sectionId === 'tasks') this.tasks.refresh();
    if (sectionId === 'daily-note') this.notes.refresh();
    if (sectionId === 'standup') this.standup.refresh();
  }

  protected async copyPanelLink(sectionId: string): Promise<void> {
    const route = this.panelRoute(sectionId);
    if (!route || typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(`${window.location.origin}${route}`);
    this.copiedPanel.set(sectionId);
    window.setTimeout(() => {
      if (this.copiedPanel() === sectionId) this.copiedPanel.set(null);
    }, 1500);
  }

  protected openReminderComposer(): void {
    this.composerOpen.set(true);
    this.editingReminderId.set(null);
    this.reminderText.set('');
    this.reminderDue.set(null);
  }

  protected editReminder(reminder: ReminderItem): void {
    this.composerOpen.set(true);
    this.editingReminderId.set(reminder.id);
    this.reminderText.set(reminder.text);
    this.reminderDue.set(reminder.due);
  }

  protected cancelReminderEdit(): void {
    this.composerOpen.set(false);
    this.editingReminderId.set(null);
    this.reminderText.set('');
    this.reminderDue.set(null);
  }

  protected saveReminder(): void {
    if (this.editingReminderId()) {
      this.reminders.update(this.editingReminderId()!, this.reminderText(), this.reminderDue());
    } else {
      this.reminders.add(this.reminderText(), this.reminderDue());
    }
    this.cancelReminderEdit();
  }

  protected completeReminder(id: string): void {
    this.reminders.complete(id);
  }

  protected dismissReminder(id: string): void {
    this.reminders.remove(id);
  }

  protected onReminderKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.saveReminder();
    if (event.key === 'Escape') this.cancelReminderEdit();
  }

  protected togglePinnedIssue(issue: IssueItem): void {
    this.pins.toggle('issue', this.issueKey(issue));
  }

  protected togglePinnedPr(pr: PullRequestItem): void {
    this.pins.toggle('pr', this.prKey(pr));
  }

  protected togglePinnedTask(task: TaskItem): void {
    this.pins.toggle('task', this.taskKey(task));
  }

  protected togglePinnedEvent(event: CalendarEvent): void {
    this.pins.toggle('event', this.eventKey(event));
  }

  protected togglePinnedRepo(repo: RepoSummary): void {
    this.pins.toggle('repo', repo.repoFull);
  }

  protected issueRoute(priority: string): string {
    if (priority === 'urgent') return 'urgent';
    if (priority === 'active') return 'active';
    return 'backlog';
  }

  protected eventKey(event: CalendarEvent): string {
    return encodeURIComponent((event.title + event.start).substring(0, 80));
  }

  protected eventDateLabel(event: CalendarEvent): string {
    return new Date(event.start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  }

  protected eventTimeLabel(event: CalendarEvent): string {
    if (event.allDay) return 'All day';
    const start = new Date(event.start);
    return start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' });
  }

  protected cleanedBullet(bullet: string): string {
    return bullet.replace(/\*\*/g, '').replace(/`/g, '');
  }

  protected timeAgo(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (!Number.isFinite(seconds)) return 'unknown';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  protected issueKey(issue: IssueItem): string {
    return `${issue.repoFull}#${issue.number}`;
  }

  protected prKey(pr: PullRequestItem): string {
    return `${pr.repoFull}#${pr.number}`;
  }

  protected taskKey(task: TaskItem): string {
    return encodeURIComponent(task.title).substring(0, 80);
  }
}
