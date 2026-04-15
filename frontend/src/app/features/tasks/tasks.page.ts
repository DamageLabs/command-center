import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { TaskItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { STANDARD_PANEL_ACTIONS } from '../../shared/models/panel-action';
import { PanelActionsComponent } from '../../shared/ui/panel-actions.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-tasks-page',
  imports: [ViewShellComponent, PanelActionsComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Tasks" title="Tasks" subtitle="Open tasks from your Obsidian task lists, with search and pinning." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-panel-actions [actions]="headerActions" (actionSelected)="onHeaderAction($event)"></cc-panel-actions>
        <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" class="cc-input min-w-64 px-4 py-2 text-sm" placeholder="Search tasks…" />
      </div>

      @if (tasks.isLoading()) {
        <cc-state-panel kind="loading" title="Loading tasks" message="The shared tasks resource is reading current open tasks from Obsidian."></cc-state-panel>
      } @else if (tasks.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Tasks unavailable" [message]="tasks.error() || 'The tasks source could not be loaded.'"></cc-state-panel>
      } @else if (!filteredItems().length) {
        <cc-state-panel kind="empty" [title]="allItems().length ? 'No tasks match this filter' : 'All done'" [message]="allItems().length ? 'Try a different search.' : 'There are no open tasks right now.'"></cc-state-panel>
      } @else {
        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @if (pinnedItems().length) {
            <div class="lg:col-span-2 2xl:col-span-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"><span>📌</span><span>Pinned</span></div>
            @for (task of pinnedItems(); track taskKey(task)) {
              <article class="cc-list-card p-5">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-base font-semibold leading-6 text-[var(--cc-text)]">{{ task.title }}</div>
                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                      <span class="cc-label-pill">{{ task.source }}</span>
                      @if (task.section) {
                        <span>{{ task.section }}</span>
                      }
                      @if (task.recurring) {
                        <span>🔁 recurring</span>
                      }
                      @if (task.due) {
                        <span class="text-rose-300">📅 {{ task.due }}</span>
                      }
                    </div>
                  </div>
                  <button type="button" (click)="togglePinned(task)" class="cc-small-button cc-small-button-accent">Unpin</button>
                </div>
              </article>
            }
            @if (unpinnedItems().length) {
              <div class="lg:col-span-2 2xl:col-span-3 border-t border-[var(--cc-border)]"></div>
            }
          }

          @for (task of unpinnedItems(); track taskKey(task)) {
            <article class="cc-list-card p-5">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-base font-semibold leading-6 text-[var(--cc-text)]">{{ task.title }}</div>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                    <span class="cc-label-pill">{{ task.source }}</span>
                    @if (task.section) {
                      <span>{{ task.section }}</span>
                    }
                    @if (task.recurring) {
                      <span>🔁 recurring</span>
                    }
                    @if (task.due) {
                      <span class="text-rose-300">📅 {{ task.due }}</span>
                    }
                  </div>
                </div>
                <button type="button" (click)="togglePinned(task)" class="cc-small-button">Pin</button>
              </div>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class TasksPage {
  private readonly data = inject(DashboardDataService);
  private readonly pins = inject(PinService);

  protected readonly tasks = this.data.tasks();
  protected readonly searchText = signal('');
  protected readonly headerActions = STANDARD_PANEL_ACTIONS;
  protected readonly allItems = computed(() => this.tasks.data()?.open ?? []);
  protected readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter((task) => {
      return task.title.toLowerCase().includes(q)
        || task.source.toLowerCase().includes(q)
        || (task.section || '').toLowerCase().includes(q);
    });
  });
  protected readonly pinnedItems = computed(() => this.filteredItems().filter((task) => this.pins.isPinned('task', this.taskKey(task))));
  protected readonly unpinnedItems = computed(() => this.filteredItems().filter((task) => !this.pins.isPinned('task', this.taskKey(task))));
  protected readonly meta = computed(() => {
    const source = this.tasks.source();
    const open = this.tasks.data()?.open.length ?? 0;
    const done = this.tasks.data()?.completed.length ?? 0;
    const summary = `${open} open · ${done} done`;
    return source?.status ? `${summary} · ${source.status}` : summary;
  });

  protected togglePinned(task: TaskItem): void {
    this.pins.toggle('task', this.taskKey(task));
  }

  protected onHeaderAction(actionId: string): void {
    if (actionId === 'refresh') {
      this.tasks.refresh();
      return;
    }

    if (actionId === 'copy') {
      void this.copyLink();
    }
  }

  private async copyLink(): Promise<void> {
    if (typeof window === 'undefined' || !navigator?.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
  }

  protected taskKey(task: TaskItem): string {
    return encodeURIComponent(task.title).substring(0, 80);
  }
}
