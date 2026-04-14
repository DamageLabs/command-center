import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'command-center-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<ThemeMode>(this.resolveInitialTheme());

  constructor() {
    effect(() => {
      const current = this.theme();
      const root = this.document.documentElement;

      root.classList.toggle('dark', current === 'dark');
      root.classList.toggle('light', current === 'light');

      try {
        window.localStorage.setItem(STORAGE_KEY, current);
      } catch {
        // ignore storage failures in private mode or restricted environments
      }
    });
  }

  toggleTheme(): void {
    this.theme.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  private resolveInitialTheme(): ThemeMode {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {
      // ignore storage failures and fall back to system preference
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
}
