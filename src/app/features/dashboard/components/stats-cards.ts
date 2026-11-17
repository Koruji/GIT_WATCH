import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CATEGORIES, CATEGORY_LABELS, Category } from '../../../core/models/git-event.model';

export interface DashboardStats {
  readonly total: number;
  readonly unread: number;
  readonly urgent: number;
  readonly pending: number;
  readonly failed: number;
  readonly byCategory: Record<Category, number>;
}

/** Indicateurs clés + répartition par catégorie. */
@Component({
  selector: 'app-stats-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="grid" aria-label="Indicateurs">
      <article class="card kpi">
        <span class="label">Événements</span>
        <strong class="value">{{ stats().total }}</strong>
      </article>
      <article class="card kpi">
        <span class="label">Non lus</span>
        <strong class="value">{{ stats().unread }}</strong>
      </article>
      <article class="card kpi urgent">
        <span class="label">Urgents (haute / critique)</span>
        <strong class="value">{{ stats().urgent }}</strong>
      </article>
      <article class="card kpi">
        <span class="label">Analyses en attente / échec</span>
        <strong class="value">{{ stats().pending }} / {{ stats().failed }}</strong>
      </article>

      <article class="card breakdown">
        <span class="label">Répartition par catégorie</span>
        <ul>
          @for (row of rows(); track row.category) {
            <li>
              <span class="cat">{{ row.label }}</span>
              <span
                class="bar"
                role="img"
                [attr.aria-label]="row.label + ' : ' + row.count"
              >
                <span class="fill" [style.width.%]="row.percent"></span>
              </span>
              <span class="n">{{ row.count }}</span>
            </li>
          }
        </ul>
      </article>
    </section>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.875rem 1rem;
    }
    .label {
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    .value {
      font-size: 1.625rem;
    }
    .urgent .value {
      color: #b42318;
    }
    .breakdown {
      grid-column: 1 / -1;
      padding: 0.875rem 1rem;
    }
    ul {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.5rem 1.25rem;
      margin: 0.5rem 0 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: 4.5rem 1fr 1.5rem;
      align-items: center;
      gap: 0.5rem;
    }
    .bar {
      height: 6px;
      background: var(--surface-2);
      border-radius: 999px;
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--primary);
    }
    .n {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    @media (max-width: 1100px) {
      .grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      ul {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class StatsCards {
  readonly stats = input.required<DashboardStats>();

  protected readonly rows = computed(() => {
    const { byCategory } = this.stats();
    const max = Math.max(1, ...CATEGORIES.map((c) => byCategory[c]));
    return CATEGORIES.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      count: byCategory[category],
      percent: (byCategory[category] / max) * 100,
    }));
  });
}
