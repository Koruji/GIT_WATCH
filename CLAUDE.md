# GitWatch — contexte et feuille de route pour Claude Code

> Ce fichier est lu automatiquement par Claude Code à la racine du projet. Il résume tout le contexte et la liste des tâches. Réponds en **français** (l'utilisateur est francophone). Voir aussi `README.md`, `BRIEF-render-n8n-gateway.md` et `INSTRUCTIONS-IA-deploiement.md`.

## 1. Le produit

**GitWatch** est un SaaS multi-tenant qui surveille des dépôts GitHub choisis. À chaque `push`, `pull_request` ou création de branche, l'événement est :
1. reçu par une **Gateway** (webhook GitHub) et stocké dans Supabase avec `status = 'pending'` ;
2. analysé par **N8N** + un LLM : catégorie (`bug|feature|refactor|docs|chore`), urgence (`low|medium|high|critical`), labels proposés, résumé ;
3. enregistré dans la table `analyses` puis affiché en direct dans le **dashboard Angular**.

Projet d'un étudiant (Master 2 Full Stack) avec un collègue. L'utilisateur gère **Angular + Supabase**. Le collègue gère **N8N + Gateway sur Render** (voir les deux fichiers de brief). **Ne fais pas leur travail** sauf demande explicite.

## 2. Architecture

```
Angular ──(supabase-js, RLS)──► Supabase (Auth + Postgres + Realtime)
GitHub ──webhook──► Gateway (Render) ──► N8N (Render) ──► LLM
                       │                    │
                       └────────┬───────────┘
                                ▼
                         Supabase (Postgres)
```

- Le **front lit et écrit Supabase directement** (sécurisé par la RLS). Il n'appelle **jamais** N8N, et jamais la Gateway pour les données.
- La Gateway et N8N écrivent dans Supabase : la Gateway avec la clé `service_role`, N8N avec le rôle Postgres restreint `n8n_worker` (jamais `service_role`).
- **1 compte = 1 tenant.** Le trigger `handle_new_user` crée à l'inscription : profil, tenant (nom = `workspace_name` du formulaire, sinon « Espace de <nom> »), appartenance `owner`, réglages.
- SaaS : vitrine publique (landing, pricing) + inscription + application derrière login. Pas de back-office ni d'invitations d'équipe pour l'instant.

## 3. Stack et conventions

- **Angular 22**, composants standalone, signals / `computed` / `input()` / `output()`, `ChangeDetectionStrategy.OnPush`, `@if/@for/@switch`, routes lazy, guards fonctionnels, formulaires réactifs, zoneless par défaut.
- SCSS avec variables CSS ; thème clair/sombre via `data-theme`, densité via `data-density` sur `<html>`.
- TypeScript strict. Pas de `any`. Pas de logique métier dans les composants : elle va dans les services.
- Commandes : `npm install`, `npm start` (`ng serve`), `npm run build`, `npm test`.
- Libellés d'interface et commentaires en **français**.

## 4. Structure du code (`src/app`)

| Chemin | Rôle |
|---|---|
| `app.routes.ts` | `''` et `pricing` (PublicShell) ; `login`, `signup` (guestGuard) ; `app` (Shell, authGuard) : `dashboard`, `repositories`, `profile`, `settings` ; `**` → `''` |
| `app.config.ts` | router (ancres + restauration du scroll), `provideAppInitializer` qui initialise `SettingsService` |
| `core/models/` | `git-event.model.ts` (événements, analyses, enums), `user.model.ts` (User, AppSettings, DEFAULT_SETTINGS, ROLE_LABELS) |
| `core/services/` | `auth.service.ts`, `events.service.ts`, `settings.service.ts` : **actuellement des mocks** (état en signals, données de `core/data/mock-data.ts`) |
| `core/data/` | `mock-data.ts`, `plans.ts` (Free / Pro / Team) |
| `core/guards/auth.guard.ts` | `authGuard` (→ `/login?returnUrl=`), `guestGuard` (→ `/app`) |
| `features/` | `public/` (landing, pricing), `auth/` (login, signup), `dashboard/` (+ stats-cards, event-filters, event-list, event-detail), `repositories/`, `profile/`, `settings/` |
| `layout/` | `public-shell.ts`, `shell.ts` (sidebar avec nom du tenant, menu utilisateur) |
| `shared/` | `ui/badge.ts`, `pipes/time-ago.pipe.ts` |

L'interface est **validée visuellement** par l'utilisateur : ne change pas le design sans demande.

## 5. Base de données Supabase (déjà créée et appliquée)

Migrations dans `supabase/migrations/` : `20261117000000_init.sql` puis `20261117150000_n8n_storage.sql`.

> **Ne modifie jamais une migration déjà appliquée.** Toute évolution du schéma = **nouveau fichier de migration** (idempotent si possible), testé avant livraison.

Types : `member_role` (owner/admin/member), `event_type` (**push, pull_request, branch_created**), `event_category`, `urgency_level`, `analysis_status` (pending/done/failed), `webhook_status` (ok/error/pending).

Tables : `tenants`, `profiles`, `tenant_members`, `repositories` (unique par tenant + `full_name`), `repository_secrets` (aucune policy : illisible côté client), `events` (`delivery_id` unique, `status`, `analysis_attempts`, `analysis_error`, `payload` jsonb…), `analyses` (`event_id` unique, `tenant_id` dénormalisé), `event_reads` (lu / non lu **par utilisateur**), `user_settings`.

Sécurité (RLS) : un utilisateur ne voit que les données des tenants dont il est membre (fonctions `is_tenant_member` / `is_tenant_admin`). Droits côté client (`authenticated`) : lecture sur tout (filtrée par RLS, sauf `repository_secrets`) ; écriture seulement sur `event_reads` (insert/delete), `user_settings` (insert/update/delete), `repositories.active` (update), `profiles.display_name` (update). Tout le reste (création d'événements, d'analyses, de dépôts) passe par la Gateway / N8N.

Realtime : `events` et `analyses` sont dans la publication `supabase_realtime`.

Schéma `n8n` : stockage interne de N8N, rôles `n8n_user` et `n8n_worker`. Ne pas l'exposer dans l'API Supabase.

## 6. Ce qui est fait

- Maquette complète en Angular avec données mock : vitrine (landing, pricing), inscription (avec nom d'espace de travail), login, dashboard (stats, filtres, liste, détail, lu/non lu), dépôts, profil, réglages (thème, densité, etc.).
- Schéma SQL, RLS, droits explicites, trigger d'inscription, rôles N8N : **testés en local** (pglite, deux configurations de droits Supabase).
- Tests e2e de l'interface (puppeteer, 28 vérifications) sur la version mock.
- Briefs de déploiement N8N + Gateway pour le collègue.

## 7. TÂCHES À FAIRE (dans l'ordre)

### Tâche 1 — Brancher Angular sur Supabase (priorité)

Pré-requis : l'utilisateur fournit l'URL du projet et la clé **publishable** (Project Settings › API Keys). Ce sont des valeurs publiques.

1. `npm i @supabase/supabase-js` ; `ng generate environments` ; mettre `supabaseUrl` et `supabaseKey` dans `src/environments/environment*.ts`. **Jamais la clé `service_role` dans le front.**
2. Créer `core/services/supabase.service.ts` qui porte `createClient(...)`.
3. **`AuthService`** : `signUp` avec `options.data = { display_name, workspace_name }` (le trigger lit ces champs) ; `signInWithPassword` ; `signOut` ; `updateUser({ password })` ; session et utilisateur exposés en signals via `getSession()` + `onAuthStateChange`. Récupérer le nom du tenant et le rôle via `tenant_members` + `tenants(name)`.
4. **Guards** : attendre la restauration de la session avant de décider (sinon redirection vers `/login` à chaque F5).
5. **Confirmation d'e-mail** : si elle est activée côté Supabase, `signUp` ne renvoie pas de session ; l'écran doit afficher « vérifie ta boîte mail » au lieu de rediriger.
6. **`EventsService`** : `from('events').select('*, analyses(*), repositories(full_name)').order('received_at', { ascending: false })` ; lu/non lu via `event_reads` (insert / delete) ; convertir `snake_case` → modèles `camelCase`. Pas de filtre par tenant dans les requêtes : c'est la RLS.
7. **Dépôts** : lecture + `update({ active })`. **Réglages** : `user_settings` (select / update). **Profil** : `profiles.display_name`.
8. **Temps réel** : `channel(...).on('postgres_changes', …)` sur `events` (INSERT/UPDATE) et `analyses` ; se désabonner à la destruction.
9. États à gérer dans l'UI : chargement, erreur, liste vide ; événement sans analyse (`analyses = null`, `status` pending / done / failed) → « en cours d'analyse » / « échec ».
10. Supprimer `mock-data.ts` seulement quand plus rien ne l'utilise ; garder un moyen simple de tester sans backend si utile.
11. Mettre à jour le `README.md` et adapter/relancer les tests e2e.

Réglages côté Supabase à rappeler à l'utilisateur (Authentication › URL Configuration) : *Site URL* = `http://localhost:4200` en dev, plus les *Redirect URLs*.

### Tâche 2 — Gestion des dépôts surveillés

Aujourd'hui, la création d'un dépôt et de son secret de webhook passe par le service_role. Concevoir avec l'utilisateur comment un dépôt est ajouté depuis l'interface (appel d'un endpoint de la Gateway avec le JWT Supabase, qui crée la ligne `repositories` + `repository_secrets` et affiche l'URL du webhook à configurer). **Ne modifie pas les droits RLS pour permettre l'insertion directe côté client.** Prévoir : limite par plan (`core/data/plans.ts`), statut du webhook (`webhook_status`).

### Tâche 3 — Réglages d'analyse IA (optionnel, à valider avec l'utilisateur)

Table `tenant_settings` (nouvelle migration) + section « Analyse IA » dans les réglages : urgence minimale à notifier, langue des résumés, etc. N8N lirait cette table (ajouter alors le droit `select` à `n8n_worker`).

### Tâche 4 — Finitions

Notifications selon `notify_min_urgency` (e-mail côté N8N plus tard), pagination ou scroll infini de la liste, déploiement du front (Vercel / Netlify / Render Static), tests unitaires des services, accessibilité (focus, contrastes, `aria-*`).

## 8. Règles à respecter

- **Sécurité** : la clé `service_role` ne doit apparaître ni dans le front, ni dans N8N, ni dans Git. Aucun secret commité (`.env`, mots de passe de rôles, clés API).
- **RLS** : ne la contourne pas côté client ; toute nouvelle table doit avoir la RLS activée, des policies et des `grant` **explicites** (le réglage Supabase « Automatically expose new tables » peut être coché ou non).
- **Schéma SQL** : nouvelle migration pour chaque changement ; teste-la avant de la donner (pglite ou instance Postgres locale), dans les deux configurations de droits.
- **Périmètre** : N8N et Gateway sont gérés par le collègue (voir les briefs). Si tu dois modifier le contrat de données (enums, colonnes), signale-le clairement pour que le brief soit mis à jour.
- Ne change pas le design validé ; propose avant de changer l'ergonomie.
- Dis honnêtement ce que tu n'as pas pu tester (par exemple une vraie connexion à Supabase).

## 9. Points ouverts (à demander à l'utilisateur si nécessaire)

- Fournisseur du LLM et clé API (côté N8N, pas dans ce dépôt).
- Création des webhooks GitHub : manuelle pour le premier test, puis token personnel ou GitHub App.
- Langage de la Gateway (TypeScript/Fastify par défaut dans le brief).
- Confirmation d'e-mail activée ou non à l'inscription.
- Hébergement du front en production.
