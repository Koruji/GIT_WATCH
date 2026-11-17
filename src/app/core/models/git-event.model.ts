/** Type d'événement Git reçu via webhook GitHub. */
export type EventType = 'push' | 'pull_request' | 'branch_created';

/** Catégorie déterminée par l'analyse IA. */
export type Category = 'bug' | 'feature' | 'refactor' | 'docs' | 'chore';

/** Urgence déterminée par l'analyse IA (axe indépendant de la catégorie). */
export type Urgency = 'low' | 'medium' | 'high' | 'critical';

/** État du traitement N8N / LLM pour un événement. */
export type AnalysisStatus = 'pending' | 'done' | 'failed';

export interface GitAuthor {
  readonly login: string;
  readonly avatarUrl?: string;
}

/** Résultat de l'analyse IA (table `analyses`). */
export interface Analysis {
  readonly category: Category;
  readonly urgency: Urgency;
  readonly labels: readonly string[];
  readonly summary: string;
  readonly model: string;
  readonly createdAt: string; // ISO 8601
}

/** Événement normalisé par la Gateway (table `events`). */
export interface GitEvent {
  readonly id: string;
  readonly repoId: string;
  readonly repoFullName: string;
  readonly eventType: EventType;
  readonly ref: string; // branche concernée
  readonly author: GitAuthor;
  readonly title: string; // message de commit ou titre de PR
  readonly url: string;
  readonly receivedAt: string; // ISO 8601
  readonly status: AnalysisStatus;
  readonly read: boolean;
  readonly analysis: Analysis | null;
  // Métriques optionnelles selon le type d'événement
  readonly commitsCount?: number;
  readonly filesChanged?: number;
  readonly additions?: number;
  readonly deletions?: number;
  readonly prNumber?: number;
}

export type WebhookStatus = 'ok' | 'error' | 'pending';

/** Dépôt surveillé (table `repositories`). */
export interface Repository {
  readonly id: string;
  readonly fullName: string;
  readonly defaultBranch: string;
  readonly active: boolean;
  readonly webhookStatus: WebhookStatus;
}

export interface Tenant {
  readonly id: string;
  readonly name: string;
}

/** Filtres du dashboard. `null` = pas de filtre. */
export interface EventFilters {
  readonly search: string;
  readonly repoId: string | null;
  readonly eventType: EventType | null;
  readonly category: Category | null;
  readonly urgency: Urgency | null;
  readonly unreadOnly: boolean;
}

export const EMPTY_FILTERS: EventFilters = {
  search: '',
  repoId: null,
  eventType: null,
  category: null,
  urgency: null,
  unreadOnly: false,
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  push: 'Push',
  pull_request: 'Pull request',
  branch_created: 'Nouvelle branche',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  feature: 'Feature',
  refactor: 'Refactor',
  docs: 'Docs',
  chore: 'Chore',
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
  critical: 'Critique',
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];
export const URGENCIES = Object.keys(URGENCY_LABELS) as Urgency[];
export const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as EventType[];
