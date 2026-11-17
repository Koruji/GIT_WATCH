import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Réserve une route aux utilisateurs connectés, sinon redirige vers /login (avec retour). */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready; // attend la restauration de la session (sinon redirection à chaque F5)
  return auth.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Empêche un utilisateur déjà connecté d'afficher la page de connexion. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.isAuthenticated() ? router.createUrlTree(['/app']) : true;
};
