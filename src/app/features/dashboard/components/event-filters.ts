import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  Category,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EventFilters,
  EventType,
  Repository,
  URGENCIES,
  URGENCY_LABELS,
  Urgency,
} from '../../../core/models/git-event.model';

const valueOf = (event: Event): string => (event.target as HTMLInputElement | HTMLSelectElement).value;

/** Barre de filtres : composant « présentationnel », l'état vit dans EventsService. */
@Component({
  selector: 'app-event-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="filters card" (submit)="$event.preventDefault()" role="search">
      <label class="field search">
        <span class="visually-hidden">Rechercher</span>
        <input
          type="search"
          placeholder="Rechercher (titre, branche, auteur, label…)"
          [value]="filters().search"
          (input)="filtersChange.emit({ search: valueOf($event) })"
        />
      </label>

      <label class="field">
        <span>Dépôt</span>
        <select (change)="filtersChange.emit({ repoId: valueOf($event) || null })">
          <option value="" [selected]="!filters().repoId">Tous</option>
          @for (repo of repositories(); track repo.id) {
            <option [value]="repo.id" [selected]="filters().repoId === repo.id">
              {{ repo.fullName }}
            </option>
          }
        </select>
      </label>

      <label class="field">
        <span>Événement</span>
        <select (change)="filtersChange.emit({ eventType: asType(valueOf($event)) })">
          <option value="" [selected]="!filters().eventType">Tous</option>
          @for (t of eventTypes; track t) {
            <option [value]="t" [selected]="filters().eventType === t">{{ typeLabels[t] }}</option>
          }
        </select>
      </label>

      <label class="field">
        <span>Catégorie</span>
        <select (change)="filtersChange.emit({ category: asCategory(valueOf($event)) })">
          <option value="" [selected]="!filters().category">Toutes</option>
          @for (c of categories; track c) {
            <option [value]="c" [selected]="filters().category === c">{{ categoryLabels[c] }}</option>
          }
        </select>
      </label>

      <label class="field">
        <span>Urgence</span>
        <select (change)="filtersChange.emit({ urgency: asUrgency(valueOf($event)) })">
          <option value="" [selected]="!filters().urgency">Toutes</option>
          @for (u of urgencies; track u) {
            <option [value]="u" [selected]="filters().urgency === u">{{ urgencyLabels[u] }}</option>
          }
        </select>
      </label>

      <label class="check">
        <input
          type="checkbox"
          [checked]="filters().unreadOnly"
          (change)="filtersChange.emit({ unreadOnly: checkedOf($event) })"
        />
        Non lus
      </label>

      <button type="button" class="btn" (click)="reset.emit()">Réinitialiser</button>
    </form>
  `,
  styles: `
    .filters {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .search {
      flex: 1 1 260px;
    }
    input[type='search'],
    select {
      padding: 0.4375rem 0.625rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--surface);
      font-size: 0.875rem;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding-bottom: 0.5rem;
    }
  `,
})
export class EventFiltersBar {
  readonly filters = input.required<EventFilters>();
  readonly repositories = input.required<readonly Repository[]>();

  readonly filtersChange = output<Partial<EventFilters>>();
  readonly reset = output<void>();

  protected readonly eventTypes = EVENT_TYPES;
  protected readonly categories = CATEGORIES;
  protected readonly urgencies = URGENCIES;
  protected readonly typeLabels = EVENT_TYPE_LABELS;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly urgencyLabels = URGENCY_LABELS;

  protected readonly valueOf = valueOf;
  protected readonly checkedOf = (event: Event): boolean => (event.target as HTMLInputElement).checked;
  protected asType = (v: string): EventType | null => (v ? (v as EventType) : null);
  protected asCategory = (v: string): Category | null => (v ? (v as Category) : null);
  protected asUrgency = (v: string): Urgency | null => (v ? (v as Urgency) : null);
}
