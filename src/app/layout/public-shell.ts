import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/** Layout des pages publiques : en-tête de navigation, contenu, pied de page. */
@Component({
  selector: 'app-public-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <div class="bar">
        <a class="brand" routerLink="/"><span aria-hidden="true">◉</span> GitWatch</a>

        <nav aria-label="Navigation du site">
          <a routerLink="/" fragment="features">Fonctionnalités</a>
          <a routerLink="/" fragment="how">Comment ça marche</a>
          <a routerLink="/pricing" routerLinkActive="active">Tarifs</a>
        </nav>

        <div class="actions">
          @if (auth.isAuthenticated()) {
            <a class="btn primary" routerLink="/app">Ouvrir l'application</a>
          } @else {
            <a class="btn ghost" routerLink="/login">Connexion</a>
            <a class="btn primary" routerLink="/signup">Commencer</a>
          }
        </div>
      </div>
    </header>

    <main>
      <router-outlet />
    </main>

    <footer class="foot">
      <div class="bar">
        <span class="brand"><span aria-hidden="true">◉</span> GitWatch</span>
        <span class="muted">Surveillance de dépôts GitHub assistée par IA · © 2026</span>
      </div>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
    .top {
      position: sticky;
      top: 0;
      z-index: 10;
      background: color-mix(in srgb, var(--bg) 85%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      max-width: 1120px;
      margin: 0 auto;
      padding: 0.75rem 1.5rem;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--text);
      text-decoration: none;
    }
    .brand span {
      color: var(--primary);
    }
    nav {
      display: flex;
      gap: 1.5rem;
    }
    nav a {
      color: var(--text-muted);
      font-weight: 500;
      text-decoration: none;
    }
    nav a:hover,
    nav a.active {
      color: var(--text);
    }
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    .actions a {
      text-decoration: none;
      color: inherit;
    }
    .actions a.primary {
      color: #fff;
    }
    .btn.ghost {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }
    .foot {
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .muted {
      color: var(--text-muted);
      font-size: 0.8125rem;
    }
    @media (max-width: 760px) {
      nav {
        display: none;
      }
      .bar {
        padding: 0.75rem 1rem;
      }
      .foot .bar {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `,
})
export class PublicShell {
  protected readonly auth = inject(AuthService);
}
