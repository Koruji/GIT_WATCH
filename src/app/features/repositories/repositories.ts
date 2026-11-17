import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WebhookStatus } from '../../core/models/git-event.model';
import { EventsService } from '../../core/services/events.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { Badge, BadgeTone } from '../../shared/ui/badge';

const WEBHOOK_LABELS: Record<WebhookStatus, string> = {
  ok: 'Webhook actif',
  error: 'Webhook en erreur',
  pending: 'En cours de configuration',
};

const WEBHOOK_TONES: Record<WebhookStatus, BadgeTone> = {
  ok: 'ok',
  error: 'critical',
  pending: 'warn',
};

/** Gestion des dépôts surveillés par le tenant. */
@Component({
  selector: 'app-repositories',
  imports: [Badge, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div>
        <h1>Dépôts surveillés</h1>
        <p class="sub">Choisissez les dépôts dont les événements sont analysés.</p>
      </div>
      <button type="button" class="btn primary" disabled title="Prévu : connexion GitHub (App ou token)">
        + Ajouter un dépôt
      </button>
    </header>

    @if (svc.error(); as message) {
      <p class="alert" role="alert">{{ message }}</p>
    }

    @if (svc.loading() && svc.repositories().length === 0) {
      <p class="card state" role="status">Chargement des dépôts…</p>
    } @else if (svc.repositories().length === 0) {
      <p class="card state">Aucun dépôt surveillé pour l'instant.</p>
    } @else {
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Dépôt</th>
            <th scope="col">Branche par défaut</th>
            <th scope="col">Webhook</th>
            <th scope="col">Événements</th>
            <th scope="col">Dernier événement</th>
            <th scope="col">Surveillé</th>
          </tr>
        </thead>
        <tbody>
          @for (repo of svc.repositories(); track repo.id) {
            <tr>
              <th scope="row">{{ repo.fullName }}</th>
              <td><code>{{ repo.defaultBranch }}</code></td>
              <td>
                <app-badge [tone]="tones[repo.webhookStatus]">{{ labels[repo.webhookStatus] }}</app-badge>
              </td>
              <td>{{ svc.eventCountByRepo().get(repo.id) ?? 0 }}</td>
              <td>{{ svc.lastEventByRepo().get(repo.id) | timeAgo }}</td>
              <td>
                <label class="switch">
                  <input
                    type="checkbox"
                    [checked]="repo.active"
                    (change)="svc.toggleRepository(repo.id)"
                  />
                  <span class="visually-hidden">Surveiller {{ repo.fullName }}</span>
                </label>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
    }
    h1 {
      font-size: 1.5rem;
    }
    .sub {
      margin: 0.125rem 0 0;
      color: var(--text-muted);
    }
    .table-wrap {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    .state {
      margin: 0;
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
    }
    .alert {
      margin: 0;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      background: #fde8e8;
      color: #b42318;
    }
    th,
    td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    thead th {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tbody tr:last-child > * {
      border-bottom: 0;
    }
    tbody th {
      font-weight: 600;
    }
    input[type='checkbox'] {
      width: 1.125rem;
      height: 1.125rem;
      accent-color: var(--primary);
    }
  `,
})
export class Repositories {
  protected readonly svc = inject(EventsService);
  protected readonly labels = WEBHOOK_LABELS;
  protected readonly tones = WEBHOOK_TONES;
}
