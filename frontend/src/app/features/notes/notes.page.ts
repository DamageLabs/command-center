import { Component, computed, inject } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-notes-page',
  imports: [ViewShellComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Pass 1" title="Notes" subtitle="Daily note, decision log, and latest standup presentation now run from Angular." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <cc-pill tone="info">Angular secondary view</cc-pill>
        <button type="button" (click)="refresh()" class="inline-flex items-center rounded-full border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] px-4 py-2 text-sm font-medium text-[var(--cc-text-muted)] transition hover:border-amber-300/40 hover:text-[var(--cc-text)]">Refresh</button>
      </div>

      <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article class="space-y-6">
          <section class="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 md:p-7">
            <div class="flex items-center justify-between gap-4">
              <div class="text-lg font-semibold tracking-tight text-[var(--cc-text)]">Latest Standup</div>
              <cc-pill tone="info">{{ standup.data()?.isToday ? 'Today' : (standup.data()?.date || 'Recent') }}</cc-pill>
            </div>
            <div class="mt-5">
              @if (standup.isLoading()) {
                <cc-state-panel kind="loading" title="Loading standup" message="Reading the latest standup summary from the shared notes resource layer."></cc-state-panel>
              } @else if (standup.isUnavailable()) {
                <cc-state-panel kind="unavailable" title="Standup unavailable" [message]="standup.error() || 'The latest standup could not be loaded.'"></cc-state-panel>
              } @else if (!standup.data()) {
                <cc-state-panel kind="empty" title="No standup yet" message="A recent standup has not been loaded yet."></cc-state-panel>
              } @else {
                <div class="space-y-4">
                  <div class="text-sm text-[var(--cc-text-muted)]">{{ standup.data()!.title }}</div>
                  @for (section of standup.data()!.sections; track section.repo) {
                    <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
                      <div class="flex items-center justify-between gap-4">
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
            </div>
          </section>
        </article>

        <article class="space-y-6">
          <section class="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 md:p-7">
            <div class="text-lg font-semibold tracking-tight text-[var(--cc-text)]">Daily Note</div>
            <div class="mt-5">
              @if (notes.isLoading()) {
                <cc-state-panel kind="loading" title="Loading daily note" message="Reading the most recent daily note from the configured notes paths."></cc-state-panel>
              } @else if (notes.isUnavailable()) {
                <cc-state-panel kind="unavailable" title="Notes unavailable" [message]="notes.error() || 'Daily note data could not be loaded.'"></cc-state-panel>
              } @else if (!notes.data()?.dailyNote) {
                <cc-state-panel kind="empty" title="No recent daily note" message="No recent daily note was found in the configured Obsidian paths."></cc-state-panel>
              } @else {
                <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-5">
                  <div class="flex items-center justify-between gap-4">
                    <div class="text-sm font-semibold text-[var(--cc-text)]">{{ notes.data()!.dailyNote!.date }}</div>
                    <cc-pill tone="info">{{ notes.data()!.dailyNote!.isToday ? 'Today' : 'Most recent' }}</cc-pill>
                  </div>
                  <p class="mt-4 text-sm leading-7 text-[var(--cc-text-muted)]">{{ notes.data()!.dailyNote!.preview || 'No content' }}</p>
                </div>
              }
            </div>
          </section>

          <section class="rounded-3xl border border-[var(--cc-border)] bg-[var(--cc-surface)] p-6 md:p-7">
            <div class="text-lg font-semibold tracking-tight text-[var(--cc-text)]">Recent Decisions</div>
            <div class="mt-5">
              @if (notes.isLoading()) {
                <cc-state-panel kind="loading" title="Loading decisions" message="Reading the latest decision notes from the shared notes resource."></cc-state-panel>
              } @else if (notes.isUnavailable()) {
                <cc-state-panel kind="unavailable" title="Decisions unavailable" [message]="notes.error() || 'Decision notes could not be loaded.'"></cc-state-panel>
              } @else if (!notes.data()?.decisions?.length) {
                <cc-state-panel kind="empty" title="No recent decisions" message="Recent decision notes will appear here once they are available."></cc-state-panel>
              } @else {
                <div class="space-y-3">
                  @for (decision of notes.data()!.decisions; track decision.title + decision.date) {
                    <div class="rounded-2xl border border-[var(--cc-border)] bg-[var(--cc-surface-muted)] p-4">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm font-semibold text-[var(--cc-text)]">{{ decision.title }}</div>
                        <div class="text-xs text-[var(--cc-text-soft)]">{{ decision.date }}</div>
                      </div>
                      @if (decision.status) {
                        <div class="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--cc-text-soft)]">{{ decision.status }}</div>
                      }
                      <p class="mt-3 text-sm leading-6 text-[var(--cc-text-muted)]">{{ decision.preview }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        </article>
      </section>
    </app-view-shell>
  `,
})
export class NotesPage {
  private readonly data = inject(DashboardDataService);

  protected readonly notes = this.data.notes();
  protected readonly standup = this.data.standup();
  protected readonly meta = computed(() => {
    const noteBits = this.notes.data()?.dailyNote ? this.notes.data()!.dailyNote!.date : 'No recent daily note';
    const decisions = this.notes.data()?.decisions.length ?? 0;
    return `${noteBits} · ${decisions} decisions`;
  });

  protected refresh(): void {
    this.notes.refresh();
    this.standup.refresh();
  }

  protected cleanedBullet(bullet: string): string {
    return bullet.replace(/\*\*/g, '').replace(/`/g, '');
  }
}
