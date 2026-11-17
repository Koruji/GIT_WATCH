import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { EventsService } from '../core/services/events.service';

/** Layout applicatif : barre latérale (tenant, navigation, utilisateur) et zone de contenu. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar">
      <a class="brand" routerLink="/app">
        <span class="logo" aria-hidden="true">◉</span>
        <strong>GitWatch</strong>
      </a>

      @if (auth.user(); as current) {
        <div class="tenant">
          <span class="label">Espace de travail</span>
          <span class="name">{{ current.tenantName }}</span>
        </div>
      }

      <nav aria-label="Navigation principale">
        <a
          routerLink="/app"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }"
        >
          Dashboard
          @if (events.stats().unread > 0) {
            <span class="count" [attr.aria-label]="events.stats().unread + ' non lus'">{{
              events.stats().unread
            }}</span>
          }
        </a>
        <a routerLink="/app/repositories" routerLinkActive="active">Dépôts surveillés</a>
        <a routerLink="/app/settings" routerLinkActive="active">Paramètres</a>
      </nav>

      @if (auth.user(); as user) {
        <div class="user">
          <a routerLink="/app/profile" routerLinkActive="active" class="profile" aria-label="Mon profil">
            <span class="avatar" aria-hidden="true">{{ auth.initials() }}</span>
            <span class="who">
              <strong>{{ user.displayName }}</strong>
              <span class="email">{{ user.email }}</span>
            </span>
          </a>
          <button type="button" class="logout" (click)="logout()">Se déconnecter</button>
        </div>
      }
    </aside>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }
    .sidebar {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      height: 100vh;
      padding: 1.25rem 1rem;
      background: var(--surface);
      border-right: 1px solid var(--border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.125rem;
      color: var(--text);
      text-decoration: none;
    }
    .logo {
      color: var(--primary);
    }
    .tenant {
      display: flex;
      flex-direction: column;
      padding: 0.625rem 0.75rem;
      background: var(--surface-2);
      border-radius: 8px;
    }
    .label {
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
    .name {
      font-weight: 600;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    nav a {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      color: var(--text);
      font-weight: 500;
      text-decoration: none;
    }
    nav a:hover {
      background: var(--surface-2);
    }
    nav a.active {
      background: var(--primary-soft);
      color: var(--primary);
    }
    .count {
      min-width: 1.5rem;
      padding: 0 0.4rem;
      border-radius: 999px;
      background: var(--primary);
      color: #fff;
      font-size: 0.75rem;
      text-align: center;
    }
    .user {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
    }
    .profile {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-width: 0;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      color: var(--text);
      text-decoration: none;
    }
    .profile:hover {
      background: var(--surface-2);
    }
    .profile.active {
      background: var(--primary-soft);
    }
    .avatar {
      display: grid;
      flex: none;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--primary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .who {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .who strong,
    .email {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .email {
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    .logout {
      padding: 0.5rem 0.75rem;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      text-align: left;
    }
    .logout:hover {
      background: var(--surface-2);
      color: var(--text);
    }
    .content {
      min-width: 0;
      padding: 1.5rem 2rem;
    }
    @media (max-width: 800px) {
      :host {
        grid-template-columns: 1fr;
      }
      .sidebar {
        position: static;
        height: auto;
      }
      .content {
        padding: 1rem;
      }
    }
  `,
})
export class Shell {
  protected readonly events = inject(EventsService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
