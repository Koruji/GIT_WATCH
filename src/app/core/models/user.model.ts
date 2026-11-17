import { Urgency } from './git-event.model';

export type UserRole = 'owner' | 'admin' | 'member';

/** Utilisateur connecté (table `profiles` côté Supabase). */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly tenantId: string;
  readonly tenantName: string;
  /** false pour un compte OAuth (GitHub) : pas de mot de passe à changer. */
  readonly hasPassword: boolean;
  readonly createdAt: string; // ISO 8601
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';
export type Language = 'fr' | 'en';
export type RefreshInterval = 0 | 30 | 60 | 300;

/** Préférences de l'interface (table `user_settings` côté base). */
export interface AppSettings {
  readonly theme: ThemeMode;
  readonly density: Density;
  readonly language: Language;
  readonly emailNotifications: boolean;
  readonly notifyMinUrgency: Urgency;
  readonly autoRefreshSeconds: RefreshInterval;
  readonly unreadOnlyByDefault: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  density: 'comfortable',
  language: 'fr',
  emailNotifications: true,
  notifyMinUrgency: 'high',
  autoRefreshSeconds: 0,
  unreadOnlyByDefault: false,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  member: 'Membre',
};
