import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  GitEvent,
  URGENCY_LABELS,
} from '../../../core/models/git-event.model';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { Badge } from '../../../shared/ui/badge';

/** Panneau de détail : données brutes de l'événement + résultat de l'analyse IA. */
@Component({
  selector: 'app-event-detail',
  imports: [Badge, DatePipe, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (event(); as e) {
      <article class="card detail" aria-label="Détail de l'événement">
        <header>
          <div>
            <app-badge>{{ typeLabels[e.eventType] }}</app-badge>
            @if (e.prNumber) {
              <app-badge>#{{ e.prNumber }}</app-badge>
            }
          </div>
          <button type="button" class="close" aria-label="Fermer" (click)="closed.emit()">✕</button>
        </header>

        <h2>{{ e.title }}</h2>

        <dl class="facts">
          <div><dt>Dépôt</dt><dd>{{ e.repoFullName }}</dd></div>
          <div><dt>Branche</dt><dd><code>{{ e.ref }}</code></dd></div>
          <div><dt>Auteur</dt><dd>{{ e.author.login }}</dd></div>
          <div>
            <dt>Reçu</dt>
            <dd>{{ e.receivedAt | date: 'dd/MM/yyyy HH:mm' }} ({{ e.receivedAt | timeAgo }})</dd>
          </div>
        </dl>

        @if (e.commitsCount !== undefined) {
          <div class="metrics">
            <span><strong>{{ e.commitsCount }}</strong> commit(s)</span>
            @if (e.filesChanged !== undefined) {
              <span><strong>{{ e.filesChanged }}</strong> fichier(s)</span>
            }
            @if (e.additions !== undefined) {
              <span class="add">+{{ e.additions }}</span>
              <span class="del">−{{ e.deletions }}</span>
            }
          </div>
        }

        <section class="analysis" aria-label="Analyse IA">
          <h3>Analyse IA</h3>

          @switch (e.status) {
            @case ('pending') {
              <p class="muted">Analyse en cours via N8N…</p>
            }
            @case ('failed') {
              <p class="muted">L'analyse a échoué. Vous pouvez la relancer.</p>
            }
            @default {
              @if (e.analysis; as a) {
                <div class="row">
                  <app-badge [tone]="a.category">{{ categoryLabels[a.category] }}</app-badge>
                  <app-badge [tone]="a.urgency">Urgence : {{ urgencyLabels[a.urgency] }}</app-badge>
                </div>

                <p class="summary">{{ a.summary }}</p>

                <div class="row">
                  <span class="muted">Labels proposés :</span>
                  @for (label of a.labels; track label) {
                    <app-badge>{{ label }}</app-badge>
                  }
                </div>

                <p class="muted small">
                  Modèle : {{ a.model }} · analysé {{ a.createdAt | timeAgo }}
                </p>
              }
            }
          }
        </section>

        <footer>
          <a class="btn" [href]="e.url" target="_blank" rel="noopener noreferrer">
            Ouvrir sur GitHub ↗
          </a>
          <button
            type="button"
            class="btn"
            disabled
            title="Prévu : relance via la Gateway (le front n'écrit pas dans les événements)"
          >
            Relancer l'analyse
          </button>
          <button type="button" class="btn" (click)="toggleRead.emit(e)">
            {{ e.read ? 'Marquer non lu' : 'Marquer lu' }}
          </button>
          <button
            type="button"
            class="btn primary"
            disabled
            title="Prévu en V2 : appliquer les labels sur GitHub après validation"
          >
            Appliquer les labels
          </button>
        </footer>
      </article>
    } @else {
      <div class="card placeholder">
        <p>Sélectionnez un événement pour voir son analyse.</p>
      </div>
    }
  `,
  styles: `
    .detail {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 1.25rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header div {
      display: flex;
      gap: 0.375rem;
    }
    .close {
      border: 0;
      background: transparent;
      color: var(--text-muted);
      font-size: 1rem;
    }
    h2 {
      font-size: 1.125rem;
    }
    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }
    .facts dt {
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    .facts dd {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.625rem 0.75rem;
      background: var(--surface-2);
      border-radius: 8px;
    }
    .add {
      color: #027a48;
      font-weight: 600;
    }
    .del {
      color: #b42318;
      font-weight: 600;
    }
    .analysis {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--analysis-bg);
    }
    h3 {
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--primary);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
    }
    .summary {
      margin: 0;
    }
    .muted {
      margin: 0;
      color: var(--text-muted);
    }
    .small {
      font-size: 0.75rem;
    }
    footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    footer a {
      text-decoration: none;
      color: inherit;
    }
    .placeholder {
      display: grid;
      place-items: center;
      min-height: 240px;
      padding: 2rem;
      color: var(--text-muted);
      text-align: center;
    }
  `,
})
export class EventDetail {
  readonly event = input<GitEvent | null>(null);

  readonly closed = output<void>();
  readonly toggleRead = output<GitEvent>();

  protected readonly typeLabels = EVENT_TYPE_LABELS;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly urgencyLabels = URGENCY_LABELS;
}
