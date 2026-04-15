import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'cc-trend-bars',
  standalone: true,
  template: `
    <div class="cc-trend-bars" [class.cc-trend-bars-compact]="compact()" [attr.data-tone]="tone()">
      @for (value of normalizedValues(); track $index) {
        <span class="cc-trend-bar" [style.height.%]="value"></span>
      }
    </div>
  `,
})
export class TrendBarsComponent {
  readonly values = input<number[]>([]);
  readonly tone = input<'rose' | 'amber' | 'slate' | 'fuchsia' | 'emerald' | 'sky'>('sky');
  readonly compact = input(true);

  protected readonly normalizedValues = computed(() => {
    const values = this.values().map((value) => Math.max(0, value));
    const max = Math.max(...values, 0);
    if (!values.length) return [22, 22, 22, 22, 22, 22, 22];
    if (max === 0) return values.map(() => 22);
    return values.map((value) => Math.max(18, Math.round((value / max) * 100)));
  });
}
