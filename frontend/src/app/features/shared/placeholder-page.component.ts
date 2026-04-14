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
      eyebrow="Migration target"
      [title]="title"
      [subtitle]="description"
      meta="This route exists now so future feature work lands inside the shared shell instead of inventing its own structure."
    >
      <div view-actions>
        <cc-pill tone="info">Route shell ready</cc-pill>
      </div>

      <section class="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <cc-card
          eyebrow="Why this matters"
          title="The route exists before the feature"
          description="That sounds small, but it keeps the migration honest. The Angular rewrite can now land feature work into a stable shell instead of mixing routing, page chrome, and business logic in one pass."
        >
          <div class="space-y-3 text-sm leading-6 text-[var(--cc-text-muted)]">
            <p>• route-level framing is shared and reusable</p>
            <p>• state panels are consistent before real data arrives</p>
            <p>• future feature work can focus on composition, not layout glue</p>
          </div>
        </cc-card>

        <div class="space-y-6">
          <cc-state-panel
            kind="empty"
            title="Feature migration not started yet"
            message="This page is intentionally waiting for its follow-on issue so #69 can stay focused on shared shell and primitive work."
          ></cc-state-panel>

          <cc-card eyebrow="Next step" title="Back to the scaffold home" tone="muted" [compact]="true">
            <a routerLink="/" class="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-300/15">
              Return to overview
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
