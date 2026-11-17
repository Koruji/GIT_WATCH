import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { PublicShell } from './layout/public-shell';
import { Shell } from './layout/shell';

export const routes: Routes = [
  // --- Vitrine publique ---
  {
    path: '',
    component: PublicShell,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'GitWatch · Surveillez vos dépôts GitHub avec l\'IA',
        loadComponent: () => import('./features/public/landing').then((m) => m.Landing),
      },
      {
        path: 'pricing',
        title: 'Tarifs · GitWatch',
        loadComponent: () => import('./features/public/pricing').then((m) => m.Pricing),
      },
    ],
  },

  // --- Authentification ---
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Connexion · GitWatch',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    title: 'Créer un compte · GitWatch',
    loadComponent: () => import('./features/auth/signup').then((m) => m.Signup),
  },

  // --- Application (réservée aux utilisateurs connectés) ---
  {
    path: 'app',
    component: Shell,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Dashboard · GitWatch',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'repositories',
        title: 'Dépôts surveillés · GitWatch',
        loadComponent: () =>
          import('./features/repositories/repositories').then((m) => m.Repositories),
      },
      {
        path: 'profile',
        title: 'Mon profil · GitWatch',
        loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'settings',
        title: 'Paramètres · GitWatch',
        loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
