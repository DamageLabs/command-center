import { Component, computed, inject } from '@angular/core';

import { DashboardDataService } from '../../core/data/dashboard-data.service';
import { PinService } from '../../core/state/pin.service';
import { CalendarEvent } from '../../models/api';
import { ViewShellComponent } from '../../layout/view-shell.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-calendar-page',
  imports: [ViewShellComponent, StatePanelComponent],
  template: `
    <app-view-shell eyebrow="Calendar" title="Calendar" subtitle="Upcoming events with quick pinning." [meta]="meta()">
      <div view-actions class="flex flex-wrap items-center gap-3">
        <button type="button" (click)="calendar.refresh()" class="cc-action-button">Refresh</button>
      </div>

      @if (calendar.isLoading()) {
        <cc-state-panel kind="loading" title="Loading events" message="Reading the current upcoming event window from the shared calendar resource."></cc-state-panel>
      } @else if (calendar.isUnavailable()) {
        <cc-state-panel kind="unavailable" title="Calendar unavailable" [message]="calendar.error() || 'Calendar events could not be loaded.'"></cc-state-panel>
      } @else if (!calendar.data()?.length) {
        <cc-state-panel kind="empty" title="No upcoming events" message="Nothing is scheduled in the next window."></cc-state-panel>
      } @else {
        <section class="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @if (pinnedItems().length) {
            <div class="lg:col-span-2 2xl:col-span-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300"><span>📌</span><span>Pinned</span></div>
            @for (event of pinnedItems(); track eventKey(event)) {
              <article class="cc-list-card p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-base font-semibold text-[var(--cc-text)]">{{ event.title }}</div>
                    <div class="mt-3 text-xs leading-6 text-[var(--cc-text-soft)]">{{ eventDateLabel(event) }} · {{ eventTimeLabel(event) }} · {{ event.calendar }}</div>
                    @if (event.location) {
                      <div class="mt-2 text-xs text-[var(--cc-text-soft)]">📍 {{ event.location }}</div>
                    }
                  </div>
                  <button type="button" (click)="togglePinned(event)" class="cc-small-button cc-small-button-accent">Unpin</button>
                </div>
              </article>
            }
            @if (unpinnedItems().length) {
              <div class="lg:col-span-2 2xl:col-span-3 border-t border-[var(--cc-border)]"></div>
            }
          }

          @for (event of unpinnedItems(); track eventKey(event)) {
            <article class="cc-list-card p-5" [class.opacity-60]="isPast(event)">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-base font-semibold text-[var(--cc-text)]">{{ event.title }}</div>
                  <div class="mt-3 text-xs leading-6 text-[var(--cc-text-soft)]">{{ eventDateLabel(event) }} · {{ eventTimeLabel(event) }} · {{ event.calendar }}</div>
                  @if (event.location) {
                    <div class="mt-2 text-xs text-[var(--cc-text-soft)]">📍 {{ event.location }}</div>
                  }
                </div>
                <button type="button" (click)="togglePinned(event)" class="cc-small-button">Pin</button>
              </div>
            </article>
          }
        </section>
      }
    </app-view-shell>
  `,
})
export class CalendarPage {
  private readonly data = inject(DashboardDataService);
  protected readonly pins = inject(PinService);

  protected readonly calendar = this.data.calendar();
  protected readonly allItems = computed(() => this.calendar.data() ?? []);
  protected readonly pinnedItems = computed(() => this.allItems().filter((event) => this.pins.isPinned('event', this.eventKey(event))));
  protected readonly unpinnedItems = computed(() => this.allItems().filter((event) => !this.pins.isPinned('event', this.eventKey(event))));
  protected readonly meta = computed(() => `${this.allItems().length} upcoming event${this.allItems().length === 1 ? '' : 's'}${this.calendar.source()?.status ? ` · ${this.calendar.source()!.status}` : ''}`);

  protected togglePinned(event: CalendarEvent): void {
    this.pins.toggle('event', this.eventKey(event));
  }

  protected eventKey(event: CalendarEvent): string {
    return encodeURIComponent((event.title + event.start).substring(0, 80));
  }

  protected eventDateLabel(event: CalendarEvent): string {
    const start = new Date(event.start);
    const today = new Date();
    if (start.toDateString() === today.toDateString()) return 'Today';
    return start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  }

  protected eventTimeLabel(event: CalendarEvent): string {
    if (event.allDay) return 'All day';
    const start = new Date(event.start);
    const end = new Date(event.end);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })}`;
  }

  protected isPast(event: CalendarEvent): boolean {
    return new Date(event.end) < new Date();
  }
}
