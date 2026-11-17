# GitWatch — brief complet pour l'IA du collègue (Gateway + N8N)

> Document destiné à l'assistant IA qui aide la personne en charge de la **Gateway** et de **N8N** (déployés sur Render).
> Réponds en **français**. Ce fichier décrit tout ce qu'il faut savoir sur le projet, le contrat de données avec le front et la base, et ce qui est attendu de ton côté.
> Le front Angular et la base Supabase sont gérés par l'autre membre de l'équipe : **ne les modifie pas** sans le signaler (voir §11).

---

## 1. Le produit en bref

**GitWatch** est un SaaS multi-tenant qui surveille des dépôts GitHub choisis. À chaque `push`, `pull_request` ou création de branche :

1. GitHub envoie un **webhook** à la **Gateway** ;
2. la Gateway vérifie la signature, normalise l'événement et l'écrit dans Supabase (`events`, `status = 'pending'`) ;
3. **N8N** (avec un LLM) analyse l'événement : catégorie, urgence, labels proposés, résumé ;
4. le résultat est écrit dans la table `analyses` et l'événement passe en `status = 'done'` (ou `'failed'`) ;
5. le **dashboard Angular** l'affiche **en direct** (Supabase Realtime).

Projet étudiant (Master 2 Full Stack, YNOV). Équipe de deux : une personne sur Angular + Supabase, une sur N8N + Gateway.

## 2. Architecture

```
Angular ──(supabase-js, RLS)──► Supabase (Auth + Postgres + Realtime)
GitHub ──webhook──► Gateway (Render) ──► N8N (Render) ──► LLM
                       │                    │
                       └────────┬───────────┘
                                ▼
                         Supabase (Postgres)
```

Règles structurantes :

- Le **front lit et écrit Supabase directement** (sécurisé par la RLS). Il n'appelle **jamais N8N**, et **jamais la Gateway pour les données** (seul futur appel prévu : ajout d'un dépôt, voir §8).
- La **Gateway** écrit dans Supabase avec la clé **`service_role`** (contourne la RLS).
- **N8N** écrit avec le rôle Postgres restreint **`n8n_worker`** — **jamais `service_role`**.
- **1 compte = 1 tenant.** À l'inscription, un trigger crée le profil, le tenant, l'appartenance `owner` et les réglages.
- Les événements, analyses et dépôts sont **créés uniquement par la Gateway / N8N**. Le front n'a aucun droit d'insertion dessus.

## 3. Accès et informations de connexion

| Élément | Valeur / où la trouver |
|---|---|
| URL du projet Supabase (API) | `https://svzsuxncspozihxcipnc.supabase.co` |
| Hôte Postgres (connexion directe) | `db.svzsuxncspozihxcipnc.supabase.co` (⚠️ **ce n'est pas l'URL de l'API**) |
| Clé publishable (front) | dans `src/environments/environment*.ts` du front ; publique |
| Clé `service_role` | Supabase › Project Settings › API Keys. **Secret** : à mettre uniquement dans les variables d'environnement de la Gateway sur Render |
| Mot de passe du rôle `n8n_worker` | défini à l'application de la migration `n8n_storage` ; à demander au propriétaire du projet ; uniquement dans les variables N8N sur Render |
| Dépôt Git | à demander à l'équipe (le projet n'est pas encore versionné en local au moment de l'écriture) |

**À ne jamais faire** : committer un secret (`.env`, clés, mots de passe de rôles), mettre `service_role` dans N8N ou dans le front, coller un secret dans une conversation avec une IA externe.

Si une connexion Postgres directe échoue depuis Render (IPv6), utiliser le **pooler Supabase** (Project Settings › Database › Connection pooling) plutôt que l'hôte `db.…`.

## 4. Schéma de base de données (état réel)

Migrations dans `supabase/migrations/` :

1. `20261117000000_init.sql` — schéma, RLS, droits, trigger d'inscription, Realtime.
2. `20261117180000_oauth_microsoft.sql` — trigger lisant aussi `full_name`/`name` (OAuth) + droit de renommer son tenant. (Le nom du fichier mentionne Microsoft par historique ; l'OAuth utilisé finalement est **GitHub**.)
3. `n8n_storage` (schéma `n8n`, rôles `n8n_user`, `n8n_worker`, colonnes `analysis_attempts` / `analysis_error` sur `events`) — **citée dans la doc du projet mais absente du dossier `supabase/migrations/` au moment de l'écriture**. Vérifie auprès de l'équipe qu'elle est bien appliquée et récupère-la : c'est elle qui définit les droits exacts de `n8n_worker`. Ne pars pas du principe que ces colonnes/rôles existent sans les avoir vérifiés dans la base (`\d public.events`, `\du`).

> **Règle** : ne modifie jamais une migration déjà appliquée. Toute évolution = **nouveau fichier de migration**, idempotent si possible, **testé avant livraison**, et signalé à l'équipe (§11).

### Types énumérés

| Type | Valeurs |
|---|---|
| `event_type` | `push`, `pull_request`, `branch_created` |
| `event_category` | `bug`, `feature`, `refactor`, `docs`, `chore` |
| `urgency_level` | `low`, `medium`, `high`, `critical` |
| `analysis_status` | `pending`, `done`, `failed` |
| `webhook_status` | `ok`, `error`, `pending` |
| `member_role` | `owner`, `admin`, `member` |

### Tables (schéma `public`)

**`tenants`** — `id uuid`, `name text`, `created_at`.

**`profiles`** — `id` (= `auth.users.id`), `display_name`, `created_at`.

**`tenant_members`** — `(tenant_id, user_id)` PK, `role member_role`.

**`repositories`** — `id`, `tenant_id`, `full_name` (ex. `acme/api-gateway`), `default_branch` (défaut `main`), `active boolean` (défaut `true`), `webhook_status` (défaut `pending`), `created_at`. **Unique `(tenant_id, full_name)`**.

**`repository_secrets`** — `repository_id` PK, `webhook_secret text`. RLS activée **sans aucune policy** : illisible côté client, accessible uniquement par `service_role`. C'est là que la Gateway lit le secret pour vérifier `X-Hub-Signature-256`.

**`events`** — l'événement normalisé :

| Colonne | Type / remarque |
|---|---|
| `id` | uuid, défaut `gen_random_uuid()` |
| `tenant_id` | uuid, **obligatoire** (= tenant du dépôt) |
| `repository_id` | uuid, **obligatoire** |
| `event_type` | `event_type` |
| `ref` | text — branche concernée (sans le préfixe `refs/heads/`, de préférence) |
| `author_login` | text — login GitHub de l'auteur |
| `title` | text — message de commit (1re ligne) ou titre de PR |
| `url` | text — lien GitHub (commit, compare, PR, branche) |
| `delivery_id` | text, **unique** — valeur de `X-GitHub-Delivery` → **idempotence** |
| `commits_count`, `files_changed`, `additions`, `deletions`, `pr_number` | integer, **nullable** selon le type d'événement |
| `payload` | jsonb — payload GitHub brut (utile pour N8N / debug) |
| `status` | `analysis_status`, défaut `pending` |
| `received_at` | timestamptz, défaut `now()` |
| *(si migration n8n_storage appliquée)* `analysis_attempts`, `analysis_error` | compteur de tentatives / dernier message d'erreur |

**`analyses`** — une analyse par événement :

| Colonne | Remarque |
|---|---|
| `id` | uuid |
| `event_id` | uuid, **unique** (1 analyse max par événement) |
| `tenant_id` | uuid, **obligatoire**, dénormalisé (= `events.tenant_id`) pour la RLS |
| `category` | `event_category` |
| `urgency` | `urgency_level` |
| `labels` | `text[]`, défaut `{}` |
| `summary` | text — résumé lisible (en français, 1–2 phrases) |
| `model` | text — identifiant du modèle utilisé (ou règle, ex. `regle-nom-branche`) |
| `created_at` | timestamptz |

**`event_reads`** — lu / non lu **par utilisateur** (géré par le front). **`user_settings`** — préférences (géré par le front ; `notify_min_urgency` et `email_notifications` sont destinés à être lus plus tard par N8N pour les notifications, voir §9).

### Index

`tenant_members(user_id)`, `repositories(tenant_id)`, `events(tenant_id, received_at desc)`, `events(repository_id)`, `analyses(tenant_id)`.

## 5. Sécurité : RLS et droits

- La RLS est activée sur **toutes** les tables. Un utilisateur ne voit que les données des tenants dont il est membre (fonctions `is_tenant_member(t)` / `is_tenant_admin(t)`, `SECURITY DEFINER`).
- Droits côté client (`authenticated`) : **lecture** de tout (filtrée par RLS, sauf `repository_secrets`) ; écriture **uniquement** sur `event_reads` (insert/delete), `user_settings`, `repositories.active`, `profiles.display_name`, `tenants.name`.
- `service_role` : tous les droits, contourne la RLS → **réservé à la Gateway**.
- `n8n_worker` : droits minimaux (voir migration `n8n_storage`). Il lui faut a minima : `select` sur `events` et `repositories` (pour lire ce qu'il analyse), `insert` sur `analyses`, `update (status[, analysis_attempts, analysis_error])` sur `events`. **Vérifie ses droits réels** ; si un droit manque, **demande une migration** plutôt que d'utiliser `service_role`.
- **Toute nouvelle table** doit avoir RLS + policies + `grant` **explicites** (le réglage Supabase « Automatically expose new tables » peut être coché ou non).
- Ne jamais exposer le schéma `n8n` dans l'API Supabase.

## 6. Ce que doit faire la Gateway

Stack par défaut : **TypeScript / Fastify**, déployée sur **Render** (Web Service). Variables d'environnement (jamais dans Git) : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, URL interne de N8N, éventuellement un secret partagé Gateway ↔ N8N.

### 6.1 Endpoint webhook GitHub

Exemple : `POST /webhooks/github/:repositoryId` (une URL par dépôt, ce qui permet de retrouver le secret sans parser le payload avant vérification).

1. Lire le **corps brut** (indispensable pour la signature — ne pas re-sérialiser).
2. Retrouver le dépôt (`repositories`) et son secret (`repository_secrets.webhook_secret`).
3. Vérifier `X-Hub-Signature-256` (HMAC SHA-256, comparaison en temps constant). Signature invalide → `401`, **rien d'écrit**.
4. Lire `X-GitHub-Event` (`push`, `pull_request`, `create`) et `X-GitHub-Delivery`.
5. **Ignorer** (réponse `200`/`202`, rien d'écrit) : les événements non gérés (`ping` → répondre `200` et passer `webhook_status` à `ok` ; autres), les dépôts avec `active = false`, les `create` dont `ref_type != 'branch'`, les PR dont l'action n'est pas significative (garder `opened`, `reopened`, `synchronize`, `ready_for_review`, ou ce que vous décidez — à documenter).
6. **Normaliser** vers une ligne `events` :
   - `push` → `event_type='push'`, `ref` = branche, `title` = 1er message de commit (ou `head_commit.message`), `url` = `compare` ou `head_commit.url`, `commits_count`, `files_changed`/`additions`/`deletions` si dispo (sinon `NULL`), `author_login` = `pusher.name`/`sender.login`.
   - `pull_request` → `event_type='pull_request'`, `ref` = branche source, `title` = titre de PR, `url` = `html_url`, `pr_number`, `additions`, `deletions`, `files_changed` (`changed_files`), `commits_count` (`commits`), `author_login` = `pull_request.user.login`.
   - `create` (branche) → `event_type='branch_created'`, `ref` = nom de la branche, `title` = ex. `Branche créée : <ref>`, `url` = lien de la branche, métriques `NULL`.
   - Toujours : `tenant_id` et `repository_id` du dépôt, `delivery_id`, `payload` brut, `status='pending'`.
7. **Insérer** dans `events`. En cas de **doublon `delivery_id`** (contrainte unique) → ne rien refaire, répondre `200` (idempotence : GitHub rejoue parfois).
8. **Déclencher N8N** (appel HTTP vers un webhook N8N avec l'`event_id`), de façon **asynchrone** : répondre à GitHub vite (`202`) sans attendre le LLM. GitHub coupe après ~10 s.
9. Si l'appel à N8N échoue : l'événement reste `pending` ; prévoir une **reprise** (cron/relance des `pending` anciens) avec limite de tentatives.

### 6.2 Santé et opérations

- `GET /health` (utilisé par Render).
- Logs structurés **sans secrets ni payloads complets**.
- Mettre à jour `repositories.webhook_status` : `ok` après un `ping` ou une livraison valide, `error` après des échecs de signature répétés, `pending` tant qu'aucun événement n'est reçu.

### 6.3 Endpoint d'ajout de dépôt (tâche à venir, voir §8)

## 7. Ce que doit faire N8N

Déploiement Render (service N8N + sa base). **Stockage interne N8N** dans le schéma `n8n` de Supabase avec le rôle `n8n_user` ; **écriture des résultats** avec `n8n_worker`.

Workflow type :

1. **Webhook** déclenché par la Gateway avec `event_id`.
2. **Lire** l'événement (`select` sur `events`, avec son dépôt) via `n8n_worker`.
3. **Appeler le LLM** (fournisseur et clé API : **à décider avec l'équipe**, stockés uniquement dans les credentials N8N). Entrée : type d'événement, branche, titre, métriques, extraits utiles du `payload` (diff/fichiers si disponibles, tronqués). Sortie attendue : **JSON strict** :
   ```json
   {
     "category": "bug|feature|refactor|docs|chore",
     "urgency": "low|medium|high|critical",
     "labels": ["security", "backend"],
     "summary": "Résumé en français, 1 à 2 phrases."
   }
   ```
4. **Valider** la sortie : valeurs dans les enums ci-dessus (sinon correction ou échec), `labels` = tableau de chaînes courtes en minuscules, `summary` non vide.
5. **Écrire** : `insert` dans `analyses` (`event_id`, `tenant_id` = celui de l'événement, `category`, `urgency`, `labels`, `summary`, `model`), puis `update events set status='done'`. Idéalement dans une seule transaction / un seul nœud SQL. Utiliser `on conflict (event_id) do nothing/update` pour l'idempotence.
6. **En cas d'échec** (LLM indisponible, JSON invalide, timeout) : incrémenter `analysis_attempts`, renseigner `analysis_error`, retenter avec un délai (max N tentatives), puis `status='failed'`. **Ne jamais laisser un événement indéfiniment `pending`.**
7. Cas simples **sans LLM** (ex. création de branche) : une règle sur le nom de branche suffit ; mettre `model` = `regle-nom-branche` (le front affiche ce champ).

Conseils de prompt : demander la catégorie **et** l'urgence comme deux axes indépendants (un `docs` peut être `high` ; un `bug` peut être `low`) ; `critical` réservé aux failles de sécurité / pannes en prod ; résumé factuel, sans inventer ce qui n'est pas dans l'événement.

## 8. Tâche à concevoir : ajout d'un dépôt depuis l'interface

Aujourd'hui, la création d'un dépôt + de son secret passe uniquement par `service_role`. Le front a un bouton « + Ajouter un dépôt » **désactivé** en attendant. Proposition à valider avec l'équipe :

- **Endpoint Gateway** `POST /repositories` (CORS limité à l'origine du front).
- Le front envoie le **JWT Supabase** de l'utilisateur (`Authorization: Bearer <access_token>`) et `{ fullName, defaultBranch? }`.
- La Gateway **valide le JWT** (via Supabase Auth, `getUser(token)` ou vérification JWKS), retrouve le tenant de l'utilisateur et vérifie qu'il est **owner/admin**.
- Elle vérifie la **limite du plan** (Free / Pro / Team : `src/app/core/data/plans.ts` côté front ; valeurs indicatives) puis crée la ligne `repositories` (`webhook_status='pending'`) et `repository_secrets` (secret aléatoire fort), avec `service_role`.
- Elle répond avec **l'URL du webhook à configurer** et le **secret** (affiché une seule fois). Au début, la création du webhook sur GitHub est **manuelle**, puis plus tard via token personnel ou GitHub App.
- **Interdit** : ouvrir l'insertion de `repositories` au client par la RLS.

Même principe pour une éventuelle **relance d'analyse** (bouton « Relancer l'analyse », désactivé côté front) : endpoint Gateway authentifié par JWT qui remet l'événement en `pending` et redéclenche N8N. À spécifier avec l'équipe front.

## 9. Évolutions prévues (non démarrées)

- **Réglages d'analyse IA** (optionnel) : table `tenant_settings` (urgence minimale à notifier, langue des résumés…), **à valider avec l'équipe**. N8N la lirait → il faudrait alors ajouter `select` à `n8n_worker` via migration.
- **Notifications e-mail** : côté N8N, selon `user_settings.notify_min_urgency` et `email_notifications` (ajouter les droits de lecture nécessaires via migration).
- **GitHub App** pour créer les webhooks automatiquement et appliquer des labels (« Appliquer les labels » est désactivé côté front, prévu en V2).

## 10. Ce que le front attend (contrat d'affichage)

Le front (Angular 22) **lit** `events` avec la jointure `analyses(*)` et `repositories(full_name)`, trié par `received_at` décroissant (200 derniers), et s'abonne en **Realtime** à `events`, `analyses` et `repositories` (publication `supabase_realtime`, RLS appliquée).

Pour que l'affichage soit correct :

- Un événement **sans analyse** est affiché « en cours d'analyse » si `status='pending'`, « échec » si `status='failed'`. Il passe en « analysé » dès que la ligne `analyses` existe **et** que `status='done'`.
- **Écris l'analyse avant (ou en même temps que) `status='done'`.** Le front recharge l'événement sur chaque changement de `events` **ou** `analyses` ; il se corrige seul, mais autant éviter un état incohérent.
- `labels` : tableau de chaînes courtes (affichées en badges).
- `summary` : texte affiché tel quel dans le détail → en français, sans Markdown.
- `model` : affiché dans le détail ; mets l'identifiant réel du modèle.
- `title`, `ref`, `author_login`, `url` : **jamais vides** (colonnes `NOT NULL`) ; mets une valeur de repli lisible plutôt qu'une chaîne vide.
- Les métriques (`commits_count`…) peuvent être `NULL` : le front masque ce qui est absent.
- Un événement dont `repository_id` pointe vers un dépôt `active=false` reste visible mais ne devrait plus être créé (la Gateway l'ignore).
- Le **lu / non lu** est propre à chaque utilisateur (`event_reads`) : **ne jamais l'écrire** côté Gateway/N8N.

## 11. Règles de collaboration

- **Contrat de données** : toute modification d'enum, de colonne, de contrainte ou de droit doit être **signalée explicitement** à l'équipe (le front et ce brief doivent être mis à jour). Ajouter une valeur d'enum (`alter type … add value`) casse les types TypeScript du front tant qu'ils ne sont pas alignés.
- **Migrations** : nouveau fichier horodaté dans `supabase/migrations/`, idempotent, testé (instance Postgres locale ou pglite), vérifié dans les **deux configurations** de droits Supabase (« Automatically expose new tables » coché / non coché).
- **Périmètre** : ne modifie pas le front Angular ni le design. Pour un besoin côté front, décris-le à l'équipe.
- **Honnêteté** : dis clairement ce que tu n'as pas pu tester (par exemple une vraie livraison GitHub, un vrai appel LLM, la connexion `n8n_worker`).

## 12. Points ouverts (à décider avec l'équipe)

- Fournisseur du LLM et clé API (credentials N8N uniquement).
- Création des webhooks GitHub : manuelle pour le premier test, puis token personnel ou GitHub App.
- Langage de la Gateway (TypeScript/Fastify par défaut).
- Hébergement du front en production (l'URL finale devra être ajoutée aux *Redirect URLs* Supabase ; sans impact sur la Gateway sauf CORS).
- Statut exact de la migration `n8n_storage` (voir §4).

## 13. Checklist de test de bout en bout

1. Créer un compte dans le front (`/signup`) → un tenant et une ligne `tenant_members` (`owner`) existent.
2. Insérer **à la main** (avec `service_role`) un dépôt + un secret pour ce tenant.
3. Envoyer un faux webhook signé (`curl` avec HMAC) à la Gateway → une ligne `events` `pending` apparaît **et** s'affiche en direct dans le dashboard.
4. N8N écrit l'analyse → l'événement passe en « analysé » dans le dashboard **sans recharger la page**.
5. Rejouer le même `X-GitHub-Delivery` → aucun doublon.
6. Signature invalide → `401` et rien d'écrit.
7. Casser volontairement le LLM → l'événement finit en `failed` (pas bloqué en `pending`).
8. Vérifier avec un **second compte / second tenant** qu'il ne voit **aucune** donnée du premier (RLS).
9. Vérifier que `n8n_worker` ne peut **pas** lire `repository_secrets` ni écrire hors de ses tables.

## 14. Où regarder dans le dépôt

| Chemin | Contenu |
|---|---|
| `supabase/migrations/` | schéma, RLS, droits, triggers — **source de vérité du contrat** |
| `src/app/core/models/git-event.model.ts` | types TypeScript des événements / analyses (miroir des enums SQL) |
| `src/app/core/services/events.service.ts` | requêtes exactes du front et mapping `snake_case` → `camelCase` |
| `src/app/core/services/auth.service.ts` | inscription, connexion (e-mail + GitHub OAuth), lecture du tenant |
| `src/app/core/data/plans.ts` | plans Free / Pro / Team (limites indicatives) |
| `CLAUDE.md`, `README.md` | contexte général et conventions du front |

## 15. Déploiement sur Render (à faire, dans cet ordre)

> Les noms de variables N8N ci-dessous sont les variables officielles courantes ; **vérifie-les dans la doc N8N de la version déployée** avant de les figer. Tout secret va dans les *Environment Variables* de Render (ou un *Secret File*), **jamais dans Git**.

### 15.1 Vue d'ensemble

| Service Render | Type | Rôle |
|---|---|---|
| `gitwatch-gateway` | Web Service (Node, TypeScript/Fastify) | reçoit les webhooks GitHub, écrit dans Supabase, déclenche N8N |
| `gitwatch-n8n` | Web Service (image Docker `n8nio/n8n`) | workflow d'analyse LLM |

**Pas de base de données Render** : N8N stocke ses données internes dans le **schéma `n8n` de Supabase** (rôle `n8n_user`), pas dans une base Render. Les résultats d'analyse sont écrits dans `public` avec le rôle `n8n_worker`.

Idéal : un fichier `render.yaml` (Blueprint) à la racine du dépôt de la Gateway pour décrire les deux services (variables sensibles en `sync: false`).

### 15.2 ⚠️ Plan gratuit de Render : mise en veille

Un Web Service gratuit **s'endort après ~15 min** sans trafic et met 30 s à 1 min à se réveiller. Conséquences :
- GitHub abandonne un webhook après ~10 s → **événements perdus** si la Gateway dort ;
- la Gateway qui appelle N8N endormi peut expirer.

Solutions : plan payant minimal (Starter) pour la Gateway au moins, **ou** un ping régulier de `/health` (UptimeRobot, cron…) **et** un mécanisme de reprise des `pending` (§6.1 point 9). Pour une démo de soutenance, bien **réveiller les deux services avant** de présenter.

### 15.3 Gateway — variables d'environnement

| Variable | Valeur |
|---|---|
| `SUPABASE_URL` | `https://svzsuxncspozihxcipnc.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` (**secret**, Gateway uniquement) |
| `N8N_WEBHOOK_URL` | URL du webhook N8N de production (`https://<service-n8n>.onrender.com/webhook/<chemin>`) |
| `N8N_SHARED_SECRET` | secret partagé Gateway → N8N (en-tête vérifié par N8N) |
| `ALLOWED_ORIGINS` | origine(s) du front pour le CORS (`http://localhost:4200`, puis l'URL de prod) |
| `PORT` | fourni par Render ; écouter sur `0.0.0.0:$PORT` |

Réglages Render : *Health Check Path* = `/health`, *Build Command* `npm ci && npm run build`, *Start Command* `node dist/server.js` (adapter), version de Node fixée (`NODE_VERSION`).

Une fois déployée, l'**URL de webhook à donner à GitHub** est `https://<gateway>.onrender.com/webhooks/github/<repositoryId>` (content-type `application/json`, secret = celui de `repository_secrets`, événements : *Pushes*, *Pull requests*, *Branch or tag creation*).

### 15.4 N8N — variables d'environnement

| Variable | Valeur / remarque |
|---|---|
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_HOST` / `_PORT` / `_DATABASE` | hôte/port/base de Supabase (utiliser le **pooler** si l'hôte direct est injoignable depuis Render) |
| `DB_POSTGRESDB_USER` | `n8n_user` (**pas** `n8n_worker`, **pas** `postgres`) |
| `DB_POSTGRESDB_PASSWORD` | mot de passe de `n8n_user` (**secret**) |
| `DB_POSTGRESDB_SCHEMA` | `n8n` |
| `N8N_ENCRYPTION_KEY` | longue chaîne aléatoire, **à générer une fois et ne plus jamais changer** (sinon les credentials enregistrés deviennent illisibles) ; à sauvegarder |
| `N8N_HOST` / `N8N_PROTOCOL` / `WEBHOOK_URL` | domaine public Render en `https` (sinon N8N génère de mauvaises URLs de webhook) |
| `N8N_PROXY_HOPS` | `1` (N8N est derrière le proxy de Render) |
| `GENERIC_TIMEZONE` / `TZ` | `Europe/Paris` |
| `N8N_BASIC_AUTH_*` ou comptes N8N | protéger l'interface (ne **jamais** laisser l'éditeur ouvert sur Internet) |

**Credentials à créer dans N8N** (jamais en dur dans un workflow) :
- Postgres « Supabase écriture » → utilisateur **`n8n_worker`** ;
- clé API du LLM (fournisseur à décider, voir §12).

### 15.5 Sécuriser l'appel Gateway → N8N

Le webhook N8N de production est public par défaut. Le protéger :
- côté N8N, le nœud Webhook vérifie un en-tête (ex. `X-Gitwatch-Secret`) égal à `N8N_SHARED_SECRET` ; requête sans en-tête valide → rejet ;
- ne transmettre que l'`event_id` (et pas de données sensibles) : N8N relit l'événement en base.

Penser à **activer** le workflow (URL `/webhook/…`, pas `/webhook-test/…`) : l'URL de test ne fonctionne que pendant qu'on édite.

### 15.6 Ordre de mise en place recommandé

1. Vérifier que la migration `n8n_storage` est appliquée (schéma `n8n`, rôles) — voir §4.
2. Déployer la **Gateway** avec un endpoint `/health` seul → vérifier le déploiement.
3. Déployer **N8N** → vérifier qu'il démarre et crée ses tables dans le schéma `n8n`.
4. Créer le workflow d'analyse (§7) et le tester avec un `event_id` réel inséré à la main.
5. Brancher le webhook de la Gateway, puis tester **de bout en bout** avec la checklist du §13.
6. Seulement ensuite, configurer un vrai webhook sur un vrai dépôt GitHub.

### 15.7 Pièges fréquents

- **Hôte `db.…` injoignable depuis Render** (IPv6) → pooler Supabase.
- **Corps de la requête re-sérialisé** avant la vérification HMAC → signature toujours invalide ; utiliser le corps **brut**.
- **`N8N_ENCRYPTION_KEY` perdue ou changée** → credentials perdus.
- **Mauvais `WEBHOOK_URL`** → N8N affiche des URLs `localhost`.
- **Événement bloqué en `pending`** après un échec N8N → prévoir la reprise (§6.1 point 9, §7 point 6).
- **Mise en veille Render** (§15.2).
- **Sortie du LLM non conforme** aux enums → l'écriture échoue ; toujours valider avant l'`insert`.
