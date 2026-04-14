import { Component, computed, inject, signal } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-done-page',
  imports: [ViewShellComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Layer 1" title="Completed Tasks" subtitle="Angular done view for recently completed Obsidian tasks." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-pill tone="info">Angular done view</cc-pill>
        <button type="button" (click)="tasks.refresh()" class="inline-flex items-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]">Refresh</button>
        <input [value]="searchText()" (input)="searchText.set($any($event.target).value)" class="min-w-64 rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm text-[var(--cc-text)] outline-none transition focus:border-amber-300/40" placeholder="Search completed tasks…" />
      </div>

      @if (tasks.isLoading()) {
        <cc-state-panel kind="loading" title="Loading completed tasks" message="The shared tasks resource is loading the completed task history."></cc-state-panel>
      } @else if (tasks.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Completed tasks unavailable" [message]="tasks.error() || 'The tasks source could not be loaded.'"></cc-state-panel>
      } @else if (!filteredItems().length) {
        <cc-state-panel kind="empty" [title]="allItems().length ? 'No completed tasks match this filter' : 'No completed tasks yet'" [message]="allItems().length ? 'Try a different search.' : 'Completed tasks will appear here once work gets finished.'"></cc-state-panel>
      } @else {
        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @for (task of filteredItems(); track taskKey(task)) {
            <article class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-5 shadow-sm">
              <div class="text-base font-semibold leading-6 text-[var(--cc-text)]">{{ task.title }}</div>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--cc-text-soft)]">
                <span class="rounded-full bg-[var(--cc-surface-muted)] px-3 py-1 font-medium text-[var(--cc-text-muted)]">{{ task.source }}</span>
                @if (task.section) {
                  <span>{{ task.section }}</span>
                }
                @if (task.recurring) {
                  <span>🔁 recurring</span>
                }
                <span class="text-emerald-300">✓ {{ task.completedAt || 'completed' }}</span>
              </div>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class DonePage {
  private readonly data = inject(DashboardDataService);

  protected readonly tasks = this.data.tasks();
  protected readonly searchText = signal('');
  protected readonly allItems = computed(() => this.tasks.data()?.completed ?? []);
  protected readonly filteredItems = computed(() => {
    const q = this.searchText().trim().toLowerCase();
    if (!q) return this.allItems();
    return this.allItems().filter((task) => {
      return task.title.toLowerCase().includes(q)
        || task.source.toLowerCase().includes(q)
        || (task.section || '').toLowerCase().includes(q);
    });
  });
  protected readonly meta = computed(() => {
    const source = this.tasks.source();
    const summary = `${this.filteredItems().length} completed task${this.filteredItems().length === 1 ? '' : 's'}`;
    return source?.status ? `${summary} · ${source.status}` : summary;
  });

  protected taskKey(task: { title: string }): string {
    return encodeURIComponent(task.title).substring(0, 80);
  }
}
