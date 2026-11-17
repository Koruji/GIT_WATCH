import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, BadgeTone } from '../../shared/ui/badge';

interface PreviewRow {
  readonly icon: string;
  readonly title: string;
  readonly meta: string;
  readonly category: string;
  readonly categoryTone: BadgeTone;
  readonly urgency: string;
  readonly urgencyTone: BadgeTone;
}

interface Feature {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

interface Step {
  readonly title: string;
  readonly text: string;
}

/** Page d'accueil publique : promesse, aperçu du produit, fonctionnalités, fonctionnement. */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, Badge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero">
      <div class="inner hero-grid">
        <div class="copy">
          <span class="eyebrow">Surveillance de dépôts assistée par IA</span>
          <h1>Sachez ce qui change dans vos dépôts, sans lire chaque commit.</h1>
          <p class="lead">
            GitWatch suit vos dépôts GitHub, classe chaque push, pull request et nouvelle branche
            (bug, feature, urgence), propose des labels et résume l'essentiel dans un tableau de bord.
          </p>
          <div class="cta">
            <a class="btn primary big" routerLink="/signup">Commencer gratuitement</a>
            <a class="btn big" routerLink="/pricing">Voir les tarifs</a>
          </div>
          <p class="note">Sans carte bancaire · Votre espace est créé en quelques secondes</p>
        </div>

        <div class="preview card" aria-label="Aperçu du tableau de bord">
          <div class="preview-head">
            <strong>Activité des dépôts</strong>
            <span class="live"><i></i> En direct</span>
          </div>
          <ul>
            @for (row of preview; track row.title) {
              <li>
                <span class="icon" aria-hidden="true">{{ row.icon }}</span>
                <span class="text">
                  <span class="t">{{ row.title }}</span>
                  <span class="m">{{ row.meta }}</span>
                </span>
                <span class="tags">
                  <app-badge [tone]="row.categoryTone">{{ row.category }}</app-badge>
                  <app-badge [tone]="row.urgencyTone">{{ row.urgency }}</app-badge>
                </span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>

    <section id="features" class="section">
      <div class="inner">
        <h2>Tout ce qu'il faut pour garder le contrôle</h2>
        <p class="sub">Moins de bruit, plus de décisions : GitWatch fait le tri pour vous.</p>
        <div class="features">
          @for (f of features; track f.title) {
            <article class="card feature">
              <span class="f-icon" aria-hidden="true">{{ f.icon }}</span>
              <h3>{{ f.title }}</h3>
              <p>{{ f.text }}</p>
            </article>
          }
        </div>
      </div>
    </section>

    <section id="how" class="section alt">
      <div class="inner">
        <h2>Comment ça marche</h2>
        <ol class="steps">
          @for (s of steps; track s.title; let i = $index) {
            <li>
              <span class="n" aria-hidden="true">{{ i + 1 }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="inner final card">
        <h2>Prêt à voir ce qui se passe dans vos dépôts ?</h2>
        <p class="sub">Créez votre espace et connectez votre premier dépôt.</p>
        <a class="btn primary big" routerLink="/signup">Créer mon espace</a>
      </div>
    </section>
  `,
  styles: `
    .inner {
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 1.5rem;
    }
    .hero {
      padding: 4rem 0 3.5rem;
      background:
        radial-gradient(60rem 28rem at 80% -10%, var(--primary-soft), transparent 70%),
        var(--bg);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      gap: 3rem;
      align-items: center;
    }
    .eyebrow {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    h1 {
      margin: 1rem 0;
      font-size: clamp(2rem, 4.5vw, 3.25rem);
      letter-spacing: -0.02em;
    }
    .lead {
      margin: 0 0 1.5rem;
      max-width: 36rem;
      font-size: 1.125rem;
      color: var(--text-muted);
    }
    .cta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .cta a {
      text-decoration: none;
    }
    .cta a:not(.primary) {
      color: inherit;
    }
    .cta a.primary {
      color: #fff;
    }
    .big {
      padding: 0.75rem 1.25rem;
      font-size: 1rem;
    }
    .note {
      margin: 0.875rem 0 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .preview {
      padding: 1rem;
      box-shadow: 0 20px 40px -20px rgba(16, 24, 40, 0.25);
    }
    .preview-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 0.25rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .live {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .live i {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: #12b76a;
    }
    .preview ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .preview li {
      display: grid;
      grid-template-columns: 2rem 1fr auto;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.25rem;
    }
    .preview li + li {
      border-top: 1px solid var(--border);
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
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .t {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .m {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .tags {
      display: flex;
      gap: 0.25rem;
    }

    .section {
      padding: 4rem 0;
    }
    .section.alt {
      background: var(--surface);
      border-block: 1px solid var(--border);
    }
    h2 {
      font-size: clamp(1.5rem, 3vw, 2rem);
      letter-spacing: -0.01em;
    }
    .sub {
      margin: 0.5rem 0 0;
      color: var(--text-muted);
    }
    .features {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    .feature {
      padding: 1.25rem;
    }
    .feature h3 {
      margin: 0.75rem 0 0.375rem;
      font-size: 1rem;
    }
    .feature p {
      margin: 0;
      color: var(--text-muted);
    }
    .f-icon {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 10px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 1.25rem;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 2rem;
      margin: 2rem 0 0;
      padding: 0;
      list-style: none;
    }
    .n {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font-weight: 700;
    }
    .steps h3 {
      margin: 0.75rem 0 0.375rem;
      font-size: 1.0625rem;
    }
    .steps p {
      margin: 0;
      color: var(--text-muted);
    }
    .final {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .final a {
      margin-top: 1rem;
      text-decoration: none;
      color: #fff;
    }

    @media (max-width: 1000px) {
      .features {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 860px) {
      .hero-grid {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
      .steps {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 560px) {
      .features {
        grid-template-columns: 1fr;
      }
      .hero {
        padding: 2.5rem 0;
      }
      .inner {
        padding: 0 1rem;
      }
      .tags app-badge:last-child {
        display: none;
      }
    }
  `,
})
export class Landing {
  protected readonly preview: readonly PreviewRow[] = [
    {
      icon: '⬆',
      title: 'fix(auth): refuse les JWT expirés',
      meta: 'acme/api-gateway · main · il y a 4 minutes',
      category: 'Bug',
      categoryTone: 'bug',
      urgency: 'Critique',
      urgencyTone: 'critical',
    },
    {
      icon: '⇄',
      title: 'feat: export CSV des livraisons',
      meta: 'acme/web-dashboard · feat/export-csv · il y a 22 minutes',
      category: 'Feature',
      categoryTone: 'feature',
      urgency: 'Moyenne',
      urgencyTone: 'medium',
    },
    {
      icon: '⑂',
      title: 'Branche créée : hotfix/kafka-timeout',
      meta: 'acme/vehicle-sync · il y a 35 minutes',
      category: 'Bug',
      categoryTone: 'bug',
      urgency: 'Haute',
      urgencyTone: 'high',
    },
  ];

  protected readonly features: readonly Feature[] = [
    {
      icon: '⬆',
      title: 'Tous les événements Git',
      text: 'Push, pull requests et créations de branches sont captés automatiquement via les webhooks GitHub.',
    },
    {
      icon: '✦',
      title: 'Analyse par IA',
      text: 'Chaque événement reçoit une catégorie, un niveau d\'urgence, des labels proposés et un résumé clair.',
    },
    {
      icon: '▦',
      title: 'Dashboard en temps réel',
      text: 'Filtrez par dépôt, catégorie ou urgence, suivez ce qui est lu ou non et repérez les priorités.',
    },
    {
      icon: '⛨',
      title: 'Un espace isolé par client',
      text: 'Chaque compte dispose de son propre espace de travail : vos données ne sont jamais mélangées.',
    },
  ];

  protected readonly steps: readonly Step[] = [
    {
      title: 'Connectez vos dépôts',
      text: 'Choisissez les dépôts GitHub à surveiller. Un webhook est configuré pour vous.',
    },
    {
      title: 'L\'IA analyse chaque événement',
      text: 'Nos workflows classent le changement, évaluent son urgence et en rédigent un résumé.',
    },
    {
      title: 'Suivez tout au même endroit',
      text: 'Le tableau de bord se met à jour en direct et vous alerte quand quelque chose d\'important arrive.',
    },
  ];
}
