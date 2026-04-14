import { Injectable, signal } from '@angular/core';

export interface HomeLayoutState {
  order: string[];
  hidden: string[];
  collapsed: string[];
  compact: boolean;
}

const HOME_LAYOUT_STORAGE_KEY = 'cc-home-layout';

export const DEFAULT_HOME_LAYOUT: HomeLayoutState = {
  order: ['pinned', 'upcoming', 'issues', 'tasks', 'daily-note', 'standup'],
  hidden: [],
  collapsed: [],
  compact: false,
};

@Injectable({ providedIn: 'root' })
export class HomeLayoutService {
  private readonly layoutState = signal<HomeLayoutState>(this.load());
  private readonly customize = signal(false);

  readonly layout = this.layoutState.asReadonly();
  readonly customizeMode = this.customize.asReadonly();

  toggleCompact(): void {
    this.update((layout) => ({ ...layout, compact: !layout.compact }));
  }

  toggleCustomize(): void {
    this.customize.update((value) => !value);
  }

  reset(): void {
    this.layoutState.set({ ...DEFAULT_HOME_LAYOUT });
    this.customize.set(false);
    localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, JSON.stringify(DEFAULT_HOME_LAYOUT));
  }

  toggleCollapsed(sectionId: string): void {
    this.update((layout) => ({
      ...layout,
      collapsed: layout.collapsed.includes(sectionId)
        ? layout.collapsed.filter((id) => id !== sectionId)
        : [...layout.collapsed, sectionId],
    }));
  }

  toggleHidden(sectionId: string): void {
    this.update((layout) => ({
      ...layout,
      hidden: layout.hidden.includes(sectionId)
        ? layout.hidden.filter((id) => id !== sectionId)
        : [...layout.hidden, sectionId],
    }));
  }

  restore(sectionId: string): void {
    this.update((layout) => ({
      ...layout,
      hidden: layout.hidden.filter((id) => id !== sectionId),
    }));
  }

  move(sectionId: string, delta: number): void {
    this.update((layout) => {
      const order = [...layout.order];
      const index = order.indexOf(sectionId);
      if (index === -1) return layout;

      const nextIndex = Math.max(0, Math.min(order.length - 1, index + delta));
      if (index === nextIndex) return layout;

      const [item] = order.splice(index, 1);
      order.splice(nextIndex, 0, item);
      return { ...layout, order };
    });
  }

  pinToTop(sectionId: string): void {
    this.update((layout) => ({
      ...layout,
      order: [sectionId, ...layout.order.filter((id) => id !== sectionId)],
    }));
  }

  private load(): HomeLayoutState {
    try {
      return this.sanitize(JSON.parse(localStorage.getItem(HOME_LAYOUT_STORAGE_KEY) || '{}'));
    } catch {
      return { ...DEFAULT_HOME_LAYOUT };
    }
  }

  private sanitize(layout: Partial<HomeLayoutState>): HomeLayoutState {
    const allowed = DEFAULT_HOME_LAYOUT.order;
    const incomingOrder = Array.isArray(layout.order) ? layout.order : [];
    const order = [...new Set(incomingOrder.filter((id) => allowed.includes(id)).concat(allowed.filter((id) => !incomingOrder.includes(id))))];
    const hidden = [...new Set((Array.isArray(layout.hidden) ? layout.hidden : []).filter((id) => allowed.includes(id)))];
    const collapsed = [...new Set((Array.isArray(layout.collapsed) ? layout.collapsed : []).filter((id) => allowed.includes(id)))];
    return { order, hidden, collapsed, compact: !!layout.compact };
  }

  private update(mutator: (layout: HomeLayoutState) => HomeLayoutState): void {
    const next = this.sanitize(mutator(this.layoutState()));
    this.layoutState.set(next);
    localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, JSON.stringify(next));
  }
}
