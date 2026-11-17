import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PLANS } from '../../core/data/plans';

/** Page Tarifs : trois plans, appel à l'action vers l'inscription avec le plan pré-sélectionné. */
@Component({
  selector: 'app-pricing',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="wrap">
      <header class="head">
        <h1>Des tarifs simples, qui grandissent avec vous</h1>
        <p class="sub">Commencez gratuitement, passez à un plan supérieur quand vos dépôts se multiplient.</p>
      </header>

      <div class="plans">
        @for (plan of plans; track plan.id) {
          <article class="card plan" [class.highlight]="plan.highlighted">
            @if (plan.highlighted) {
              <span class="ribbon">Le plus choisi</span>
            }
            <h2>{{ plan.name }}</h2>
            <p class="tagline">{{ plan.tagline }}</p>
            <p class="price">
              <strong>{{ plan.price }} €</strong>
              <span>/ mois</span>
            </p>

            <ul>
              @for (feature of plan.features; track feature) {
                <li>
                  <span class="check" aria-hidden="true">✓</span>
                  {{ feature }}
                </li>
              }
            </ul>

            <a
              class="btn full"
              [class.primary]="plan.highlighted"
              routerLink="/signup"
              [queryParams]="{ plan: plan.id }"
            >
              {{ plan.cta }}
            </a>
          </article>
        }
      </div>

      <p class="foot-note">Tarifs indicatifs, hors taxes. La facturation n'est pas encore active dans cette version.</p>

      <section class="faq" aria-label="Questions fréquentes">
        <h2>Questions fréquentes</h2>
        <details class="card">
          <summary>Quels événements GitHub sont analysés ?</summary>
          <p>Les push, les pull requests et les créations de branches des dépôts que vous choisissez de surveiller.</p>
        </details>
        <details class="card">
          <summary>Mes données sont-elles isolées de celles des autres clients ?</summary>
          <p>
            Oui. Chaque compte dispose de son propre espace de travail et la base de données applique une
            isolation stricte par client : personne d'autre ne peut lire vos événements.
          </p>
        </details>
      </section>
    </section>
  `,
  styles: `
    .wrap {
      max-width: 1120px;
      margin: 0 auto;
      padding: 3rem 1.5rem 4rem;
    }
    .head {
      max-width: 40rem;
      margin: 0 auto 2.5rem;
      text-align: center;
    }
    h1 {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      letter-spacing: -0.02em;
    }
    .sub {
      margin: 0.75rem 0 0;
      color: var(--text-muted);
      font-size: 1.0625rem;
    }
    .plans {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.25rem;
      align-items: stretch;
    }
    .plan {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1.75rem 1.5rem;
    }
    .plan.highlight {
      border-color: var(--primary);
      box-shadow: 0 0 0 1px var(--primary), 0 16px 32px -16px rgba(79, 70, 229, 0.35);
    }
    .ribbon {
      position: absolute;
      top: -0.75rem;
      left: 1.5rem;
      padding: 0.125rem 0.625rem;
      border-radius: 999px;
      background: var(--primary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .plan h2 {
      font-size: 1.25rem;
    }
    .tagline {
      margin: 0;
      min-height: 2.75rem;
      color: var(--text-muted);
    }
    .price {
      display: flex;
      align-items: baseline;
      gap: 0.375rem;
      margin: 0.5rem 0;
    }
    .price strong {
      font-size: 2.5rem;
      letter-spacing: -0.02em;
    }
    .price span {
      color: var(--text-muted);
    }
    ul {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.625rem;
      margin: 0.5rem 0 1.25rem;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      gap: 0.5rem;
    }
    .check {
      color: #12b76a;
      font-weight: 700;
    }
    .full {
      justify-content: center;
      padding: 0.625rem 1rem;
      text-decoration: none;
      color: inherit;
    }
    .full.primary {
      color: #fff;
    }
    .foot-note {
      margin: 1.5rem 0 0;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
    .faq {
      max-width: 44rem;
      margin: 3.5rem auto 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .faq h2 {
      margin-bottom: 0.5rem;
      font-size: 1.25rem;
    }
    details {
      padding: 0.875rem 1.125rem;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    details p {
      margin: 0.625rem 0 0;
      color: var(--text-muted);
    }
    @media (max-width: 900px) {
      .plans {
        grid-template-columns: 1fr;
        max-width: 28rem;
        margin: 0 auto;
      }
      .tagline {
        min-height: 0;
      }
    }
  `,
})
export class Pricing {
  protected readonly plans = PLANS;
}
