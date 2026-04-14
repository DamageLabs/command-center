import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { TaskItem } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-tasks-page',
  imports: [ViewShellComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Layer 1" title="Tasks" subtitle="Angular task view with search, pinning, and shared Obsidian-backed task data." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-pill tone="info">Angular task view</cc-pill>
        <button type="button" (click)="tasks.refresh()" class="inline-flex items-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]">Refresh</button>
        <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" class="min-w-64 rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm text-[var(--cc-text)] outline-none transition focus:border-amber-300/40" placeholder="Search tasks…" />
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
              <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-base font-semibold leading-6 text-[var(--cc-text)]">{{ task.title }}</div>
                    <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                      <span class="rounded-full bg-[var(--cc-surface-muted)] px-3 py-1 font-medium text-[var(--cc-text-muted)]">{{ task.source }}</span>
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
                  <button type="button" (click)="togglePinned(task)" class="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">Unpin</button>
                </div>
              </article>
            }
            @if (unpinnedItems().length) {
              <div class="lg:col-span-2 2xl:col-span-3 border-t border-[var(--cc-border)]"></div>
            }
          }

          @for (task of unpinnedItems(); track taskKey(task)) {
            <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-base font-semibold leading-6 text-[var(--cc-text)]">{{ task.title }}</div>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                    <span class="rounded-full bg-[var(--cc-surface-muted)] px-3 py-1 font-medium text-[var(--cc-text-muted)]">{{ task.source }}</span>
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
                <button type="button" (click)="togglePinned(task)" class="rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--cc-text-muted)]">Pin</button>
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

  protected taskKey(task: TaskItem): string {
    return encodeURIComponent(task.title).substring(0, 80);
  }
}
