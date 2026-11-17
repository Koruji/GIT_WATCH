import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  EventType,
  GitEvent,
  URGENCY_LABELS,
} from '../../../core/models/git-event.model';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { Badge } from '../../../shared/ui/badge';

const TYPE_ICONS: Record<EventType, string> = {
  push: '⬆',
  pull_request: '⇄',
  branch_created: '⑂',
};

/** Liste des événements : sélection via un bouton par ligne (accessible au clavier). */
@Component({
  selector: 'app-event-list',
  imports: [Badge, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading() && totalCount() === 0) {
      <p class="empty card" role="status">Chargement des événements…</p>
    } @else if (totalCount() === 0) {
      <p class="empty card">
        Aucun événement pour l'instant. Ils apparaîtront ici dès le premier webhook reçu.
      </p>
    } @else if (events().length === 0) {
      <p class="empty card">Aucun événement ne correspond aux filtres.</p>
    } @else {
      <ul class="list card" aria-label="Événements Git">
        @for (e of events(); track e.id) {
          <li>
            <button
              type="button"
              class="row"
              [class.selected]="e.id === selectedId()"
              [class.unread]="!e.read"
              [attr.aria-current]="e.id === selectedId() ? 'true' : null"
              (click)="selected.emit(e.id)"
            >
              <span class="icon" [title]="typeLabels[e.eventType]" aria-hidden="true">{{
                icons[e.eventType]
              }}</span>

              <span class="main">
                <span class="title">{{ e.title }}</span>
                <span class="meta">
                  {{ e.repoFullName }} · <code>{{ e.ref }}</code> · {{ e.author.login }} ·
                  {{ e.receivedAt | timeAgo }}
                </span>
              </span>

              <span class="tags">
                @switch (e.status) {
                  @case ('pending') {
                    <app-badge tone="warn">Analyse en cours…</app-badge>
                  }
                  @case ('failed') {
                    <app-badge tone="critical">Analyse échouée</app-badge>
                  }
                  @default {
                    @if (e.analysis; as a) {
                      <app-badge [tone]="a.category">{{ categoryLabels[a.category] }}</app-badge>
                      <app-badge [tone]="a.urgency">{{ urgencyLabels[a.urgency] }}</app-badge>
                    }
                  }
                }
              </span>
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .list {
      margin: 0;
      padding: 0;
      list-style: none;
      overflow: hidden;
    }
    li + li {
      border-top: 1px solid var(--border);
    }
    .row {
      display: grid;
      grid-template-columns: 2rem 1fr auto;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: var(--row-pad-y, 0.75rem) 1rem;
      border: 0;
      border-left: 3px solid transparent;
      background: transparent;
      text-align: left;
    }
    .row:hover {
      background: var(--surface-2);
    }
    .row.selected {
      background: var(--primary-soft);
      border-left-color: var(--primary);
    }
    .row.unread .title {
      font-weight: 700;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      background: var(--surface-2);
      color: var(--text-muted);
    }
    .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .meta {
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    code {
      font-size: 0.75rem;
    }
    .tags {
      display: flex;
      gap: 0.375rem;
    }
    .empty {
      margin: 0;
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
    }
  `,
})
export class EventList {
  readonly events = input.required<readonly GitEvent[]>();
  readonly loading = input(false);
  readonly totalCount = input(0);
  readonly selectedId = input<string | null>(null);
  readonly selected = output<string>();

  protected readonly icons = TYPE_ICONS;
  protected readonly typeLabels = EVENT_TYPE_LABELS;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly urgencyLabels = URGENCY_LABELS;
}
