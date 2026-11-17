# GitWatch — front Angular

Front d'un SaaS de surveillance de dépôts GitHub : vitrine publique, inscription, puis application.
Modèle : **1 compte = 1 tenant** (l'espace de travail de l'utilisateur, créé à l'inscription).
Les données viennent de **Supabase** (Auth + Postgres + Realtime), protégées par la RLS.

## Lancer

```bash
npm install
# renseigner l'URL et la clé *publishable* dans src/environments/environment.development.ts
# (et environment.ts pour la prod). Jamais la clé service_role.
npm start        # http://localhost:4200
```

Dans Supabase (Authentication › URL Configuration) : *Site URL* = `http://localhost:4200` en dev, et ajouter les
*Redirect URLs* utiles. Si la confirmation d'e-mail est activée, l'inscription affiche « Vérifiez votre boîte mail ».

## Parcours et routes

| Route | Accès | Contenu |
|---|---|---|
| `/` | public | accueil marketing |
| `/pricing` | public | plans Free / Pro / Team (chiffres indicatifs : `core/data/plans.ts`) |
| `/signup` | invités | inscription : nom, **nom de l'espace**, email, mot de passe (`?plan=` pré-sélectionne un plan) |
| `/login` | invités | connexion |
| `/app` | connecté | dashboard |
| `/app/repositories`, `/app/profile`, `/app/settings` | connecté | dépôts, profil, paramètres |

Un utilisateur connecté qui ouvre `/login` ou `/signup` est renvoyé vers `/app`.

## Structure

```
src/app/
├── core/
│   ├── models/      types (GitEvent, Analysis, Repository, User, AppSettings…)
│   ├── data/        plans (Free / Pro / Team)
│   ├── guards/      authGuard, guestGuard
│   └── services/    SupabaseService (client), AuthService, EventsService (+ Realtime), SettingsService
├── layout/          Shell (application), PublicShell (vitrine)
├── shared/          Badge, TimeAgoPipe
└── features/
    ├── public/          accueil, tarifs
    ├── auth/            connexion, inscription
    ├── dashboard/       page + stats-cards, event-filters, event-list, event-detail
    ├── repositories/    gestion des dépôts surveillés
    ├── profile/         compte : infos, mot de passe, déconnexion
    └── settings/        thème, densité, langue, notifications, dashboard
```

Bonnes pratiques appliquées : composants standalone, `ChangeDetectionStrategy.OnPush`, signals
(`signal`, `computed`, `input`, `output`), `inject()`, nouveau control flow (`@if`, `@for`, `@switch`),
routes lazy-loadées, composants présentationnels vs page « conteneur », types stricts, accessibilité de base.

## Authentification

Supabase Auth : `signUp` (avec `display_name` et `workspace_name`, lus par le trigger `handle_new_user`),
`signInWithPassword`, `signOut`, `updateUser`. La session est restaurée au démarrage ; `authGuard` et `guestGuard`
attendent `AuthService.ready` avant de décider (pas de redirection vers `/login` à chaque F5). Le nom du tenant
et le rôle sont lus via `tenant_members` + `tenants(name)`.

## Paramètres

Thème (clair / sombre / système), densité de la liste et filtre « non lus » par défaut sont **appliqués**.
Langue, seuil de notification et actualisation automatique sont **enregistrés** mais sans effet tant que
l'i18n, N8N et le temps réel ne sont pas branchés. Stockage : table `user_settings` (cache `localStorage`, clé `gitwatch.settings`, pour éviter un flash de thème).

## Données affichées ↔ base de données

| Affichage | Champ | Table |
|---|---|---|
| Titre, auteur, branche, lien GitHub | `title`, `author`, `ref`, `url` | `events` |
| Type (push / PR / branche) | `event_type` | `events` |
| Date de réception | `received_at` | `events` |
| Commits, fichiers, +/− lignes, n° de PR | `commits_count`, `files_changed`, `additions`, `deletions`, `pr_number` | `events` (ou dans `payload`) |
| Lu / non lu | `read` | à rattacher à l'utilisateur (`event_reads`) |
| Statut d'analyse | `status` (pending / done / failed) | `analyses` |
| Catégorie, urgence, labels, résumé | `category`, `urgency`, `labels`, `summary` | `analyses` |
| Modèle utilisé, date d'analyse | `model`, `created_at` | `analyses` |
| Dépôt, branche par défaut, actif, état webhook | `full_name`, `default_branch`, `active`, `webhook_status` | `repositories` |
| Nom du client | `name` | `tenants` |
| Utilisateur (nom, email, rôle) | `display_name`, `email`, `role` | `profiles` + `tenant_members` |
| Préférences (thème, densité, notifications…) | `theme`, `density`, `notify_min_urgency`… | `user_settings` |

## Limites actuelles

- « Relancer l'analyse » et « Ajouter un dépôt » sont désactivés : le front n'écrit pas dans `events` ni `repositories`
  (création de dépôt prévue via la Gateway, tâche 2).
- Le temps réel suppose que `events` et `analyses` sont bien dans la publication `supabase_realtime` (migration init).
