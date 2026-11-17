import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GitEvent } from '../../core/models/git-event.model';
import { EventsService } from '../../core/services/events.service';
import { EventDetail } from './components/event-detail';
import { EventFiltersBar } from './components/event-filters';
import { EventList } from './components/event-list';
import { StatsCards } from './components/stats-cards';

/** Page « conteneur » : orchestre le service et les composants présentationnels. */
@Component({
  selector: 'app-dashboard',
  imports: [StatsCards, EventFiltersBar, EventList, EventDetail],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div>
        <h1>Activité des dépôts</h1>
        <p class="sub">Push, pull requests et branches analysés par l'IA.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn" (click)="svc.markAllRead()">Tout marquer lu</button>
      </div>
    </header>

    @if (svc.error(); as message) {
      <p class="alert" role="alert">
        {{ message }}
        <button type="button" class="btn" (click)="svc.reload()">Réessayer</button>
      </p>
    }

    <app-stats-cards [stats]="svc.stats()" />

    <app-event-filters
      [filters]="svc.filters()"
      [repositories]="svc.repositories()"
      (filtersChange)="svc.patchFilters($event)"
      (reset)="svc.resetFilters()"
    />

    <div class="split">
      <app-event-list
        [events]="svc.filteredEvents()"
        [loading]="svc.loading()"
        [totalCount]="svc.stats().total"
        [selectedId]="svc.selectedEvent()?.id ?? null"
        (selected)="svc.select($event)"
      />
      <app-event-detail
        [event]="svc.selectedEvent()"
        (closed)="svc.select(null)"
        (toggleRead)="onToggleRead($event)"
      />
    </div>
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
    .alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      background: #fde8e8;
      color: #b42318;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
      gap: 1rem;
      align-items: start;
    }
    @media (max-width: 1100px) {
      .split {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Dashboard {
  protected readonly svc = inject(EventsService);

  protected onToggleRead(event: GitEvent): void {
    this.svc.markRead(event.id, !event.read);
  }
}
