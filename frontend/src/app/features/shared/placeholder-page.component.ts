import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ViewShellComponent } from '../../layout/view-shell.component';
import { CardComponent } from '../../shared/ui/card.component';
import { PillComponent } from '../../shared/ui/pill.component';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

@Component({
  selector: 'app-placeholder-page',
  imports: [RouterLink, ViewShellComponent, CardComponent, PillComponent, StatePanelComponent],
  template: `
    <app-view-shell
      eyebrow="Coming soon"
      [title]="title"
      [subtitle]="description"
      meta="This route is reserved and ready when the feature is implemented."
    >
      <div view-actions>
        <cc-pill tone="info">Placeholder</cc-pill>
      </div>

      <section class="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <cc-card
          eyebrow="Status"
          title="This view is not wired up yet"
          description="The page shell is in place so the eventual feature can land cleanly without inventing a new layout."
        >
          <div class="space-y-3 text-sm leading-6 text-[var(--cc-text-muted)]">
            <p>• shared navigation and framing are already in place</p>
            <p>• state panels will stay visually consistent</p>
            <p>• the route is ready whenever the feature work starts</p>
          </div>
        </cc-card>

        <div class="space-y-6">
          <cc-state-panel
            kind="empty"
            title="Feature not implemented yet"
            message="There is not real data behind this page yet."
          ></cc-state-panel>

          <cc-card eyebrow="Next step" title="Back to Home" tone="muted" [compact]="true">
            <a routerLink="/" class="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-300/15">
              Return to Home
            </a>
          </cc-card>
        </div>
      </section>
    </app-view-shell>
  `,
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly description = this.route.snapshot.data['description'] as string;
}
