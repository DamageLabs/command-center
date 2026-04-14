import { Injectable, signal } from '@angular/core';

export interface ReminderItem {
  id: string;
  text: string;
  due: string | null;
  createdAt: string;
}

const REMINDER_STORAGE_KEY = 'cc-reminders';

@Injectable({ providedIn: 'root' })
export class RemindersService {
  private readonly itemsState = signal<ReminderItem[]>(this.load());

  readonly items = this.itemsState.asReadonly();

  add(text: string, due: string | null): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.persist([
      ...this.itemsState(),
      {
        id: Date.now().toString(36),
        text: trimmed,
        due,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  update(id: string, text: string, due: string | null): void {
    const trimmed = text.trim();
    if (!trimmed) return;

    this.persist(this.itemsState().map((item) => item.id === id ? { ...item, text: trimmed, due } : item));
  }

  remove(id: string): void {
    this.persist(this.itemsState().filter((item) => item.id !== id));
  }

  complete(id: string): void {
    this.remove(id);
  }

  private load(): ReminderItem[] {
    try {
      return JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private persist(items: ReminderItem[]): void {
    this.itemsState.set(items);
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(items));
  }
}
