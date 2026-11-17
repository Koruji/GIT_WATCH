export type PlanId = 'free' | 'pro' | 'team';

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  readonly price: number; // € / mois
  readonly tagline: string;
  readonly highlighted: boolean;
  readonly features: readonly string[];
  readonly cta: string;
}

/**
 * Plans affichés sur la page Tarifs. Chiffres INDICATIFS (à ajuster par l'équipe) :
 * ils devront correspondre aux quotas réellement appliqués par la Gateway.
 */
export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Pour découvrir GitWatch sur un projet.',
    highlighted: false,
    features: [
      '3 dépôts surveillés',
      '100 analyses IA par mois',
      'Historique de 7 jours',
      'Dashboard et filtres',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    tagline: 'Pour les développeurs et petites équipes.',
    highlighted: true,
    features: [
      '20 dépôts surveillés',
      '2 000 analyses IA par mois',
      'Historique de 90 jours',
      'Notifications email par seuil d\'urgence',
    ],
    cta: 'Essayer Pro',
  },
  {
    id: 'team',
    name: 'Team',
    price: 49,
    tagline: 'Pour les organisations avec beaucoup de dépôts.',
    highlighted: false,
    features: [
      'Dépôts illimités',
      '10 000 analyses IA par mois',
      'Historique de 1 an',
      'Notifications email et support prioritaire',
    ],
    cta: 'Essayer Team',
  },
];

export const isPlanId = (value: string | null): value is PlanId =>
  value === 'free' || value === 'pro' || value === 'team';
