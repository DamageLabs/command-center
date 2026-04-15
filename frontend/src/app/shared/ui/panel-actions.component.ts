import { Component, input, output } from '@angular/core';

import { PanelAction } from '../models/panel-action';

@Component({
  selector: 'cc-panel-actions',
  template: `
    <div class="cc-panel-actions">
      @for (action of actions(); track action.id) {
        <button
          type="button"
          [disabled]="action.disabled"
          [class]="actionClass(action)"
          (click)="actionSelected.emit(action.id)"
        >
          @if (action.icon) {
            <span aria-hidden="true">{{ action.icon }}</span>
          }
          <span>{{ action.label }}</span>
        </button>
      }
    </div>
  `,
})
export class PanelActionsComponent {
  readonly actions = input<PanelAction[]>([]);
  readonly actionSelected = output<string>();

  protected actionClass(action: PanelAction): string {
    const tone = action.tone === 'accent' ? 'cc-panel-action cc-panel-action-accent' : 'cc-panel-action';
    return action.disabled ? `${tone} opacity-60` : tone;
  }
}
