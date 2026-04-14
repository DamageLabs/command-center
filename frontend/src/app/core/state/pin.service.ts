import { Injectable, signal } from '@angular/core';

export type PinType = 'issue' | 'pr' | 'task' | 'event' | 'repo';

const PIN_STORAGE_KEY = 'cc-pinned';

@Injectable({ providedIn: 'root' })
export class PinService {
  private readonly pins = signal<Record<string, boolean>>(this.load());

  readonly state = this.pins.asReadonly();

  isPinned(type: PinType, id: string): boolean {
    return !!this.pins()[this.key(type, id)];
  }

  toggle(type: PinType, id: string): void {
    const key = this.key(type, id);
    const next = { ...this.pins() };

    if (next[key]) {
      delete next[key];
    } else {
      next[key] = true;
    }

    this.persist(next);
  }

  private key(type: PinType, id: string): string {
    return `${type}:${id}`;
  }

  private load(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(PIN_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private persist(next: Record<string, boolean>): void {
    this.pins.set(next);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
  }
}
