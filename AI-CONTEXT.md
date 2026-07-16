# Contexte technique pour agents IA

> Référence destinée aux agents IA intervenant sur ce dépôt. Lire ce fichier avant toute modification. En cas de divergence, la version déclarée dans le code, les fichiers de configuration, le schéma PostgreSQL et l’implémentation actuelle priment sur ce document.

Dernière vérification complète du dépôt : **2026-07-12**.

Ce document décrit l’état observé du dépôt à la version **0.7.17**. Il doit être mis à jour lorsqu’une modification importante change l’architecture, les contrats API, la persistance, les règles métier, le déploiement ou les conventions ci-dessous.

## 1. Résumé du projet

**Kingshot Vikings Planner** est une application web auto-hébergée destinée à la coordination de l’événement **Viking Vengeance** de Kingshot et, progressivement, à d’autres outils d’alliance.

- URL de production publiquement documentée : `https://vikings.dannytech.fr`.
- Version détectée : `0.7.17` dans `frontend/package.json` et `backend/package.json`.
- État : application fonctionnelle, déployée nativement sur Debian 12, avec CI/CD SSH opérationnelle et plusieurs espaces fonctionnels.
- Langue de l’interface : anglais.
- Dépôt public : `https://github.com/Daneisra/Kingshot-Vikings-Planner`.

Le produit distingue trois catégories de données et d’actions :

- **Publiques et partagées** : inscriptions, statistiques, filtres, paramètres publics, scores archivés, modèles de formations.
- **Personnelles au navigateur** : checklist de préparation et brouillons Troop Formations.
- **Administratives** : suppression, reset hebdomadaire, archives détaillées, imports, exports protégés, configuration d’événement et modification des modèles globaux via l’API.

Attention : la création et la modification d’une inscription sont publiques. Seule sa suppression nécessite actuellement l’administration.

## 2. Stack technique

### 2.1 Frontend

Les versions ci-dessous sont celles résolues dans `frontend/package-lock.json`; les plages déclarées restent dans `frontend/package.json`.

| Outil | Version résolue | Rôle |
| --- | ---: | --- |
| React | 18.3.1 | UI et état applicatif |
| React DOM | 18.3.1 | Rendu navigateur |
| TypeScript | 5.7.3 | Typage strict |
| Vite | 6.4.2 | Développement et build |
| Tailwind CSS | 3.4.19 | Styles utilitaires |
| Lucide React | 0.469.0 | Icônes |
| ESLint | 9.18.0 | Lint |
| typescript-eslint | 8.19.0 | Règles TypeScript |
| PostCSS | 8.5.8 | Pipeline CSS |
| Autoprefixer | 10.4.27 | Préfixes CSS |

Le style global est défini dans `frontend/src/index.css`. Le thème Tailwind est dans `frontend/tailwind.config.ts`. Il n’y a pas de React Router, de bibliothèque d’état globale, de bibliothèque de graphiques, ni de service worker.

### 2.2 Backend

| Outil | Version résolue | Rôle |
| --- | ---: | --- |
| Node.js | 22 en CI et dans les guides | Runtime ; aucun champ `engines` n’est déclaré |
| Express | 4.22.1 | API REST |
| TypeScript | 5.7.3 | Typage et compilation CommonJS |
| PostgreSQL client `pg` | 8.20.0 | Pool et requêtes SQL |
| Zod | 3.25.76 | Validation des entrées et de l’environnement |
| Helmet | 8.1.0 | En-têtes HTTP de sécurité |
| CORS | 2.8.6 | Politique cross-origin |
| Morgan | 1.10.1 | Logs HTTP |
| dotenv | 16.6.1 | Chargement de `backend/.env` |
| ESLint | 9.18.0 | Lint |
| tsx | 4.21.0 | Serveur de développement |

### 2.3 Production et automatisation

- Debian 12.
- PostgreSQL natif, version recommandée 15 ou plus récente.
- Nginx sert le frontend statique et reverse-proxy `/api`.
- PM2 exécute le backend compilé.
- GitHub Actions utilise Node.js 22 puis déploie par SSH.
- `rsync` publie le frontend.
- `pg_dump` et `gzip` assurent les sauvegardes documentées.

### 2.4 Scripts npm disponibles

Il n’existe **aucun `package.json` à la racine**.

`frontend/package.json` :

| Script | Commande | Rôle |
| --- | --- | --- |
| `dev` | `vite` | Serveur local sur le port 5173 |
| `lint` | `eslint src vite.config.ts` | Lint frontend |
| `typecheck` | `tsc --noEmit` séparément sur `tsconfig.app.json` et `tsconfig.node.json` | Vérification TypeScript sans artefact généré |
| `build` | `npm run typecheck && vite build` | Build de production dans `frontend/dist/` |
| `preview` | `vite preview` | Prévisualisation du build |

`backend/package.json` :

| Script | Commande | Rôle |
| --- | --- | --- |
| `dev` | `tsx watch src/index.ts` | API locale avec rechargement |
| `lint` | `eslint src` | Lint backend |
| `typecheck` | `tsc --noEmit -p tsconfig.json` | Vérification TypeScript |
| `build` | `tsc -p tsconfig.json` | Compilation dans `backend/dist/` |
| `migrate` | `node dist/scripts/migrate.js` | Applique les migrations PostgreSQL en attente |
| `start` | `node dist/index.js` | Lancement du build |
| `test` | `tsx --test src/schemas/registration-schema.test.ts` | Tests des règles critiques de validation des inscriptions |
| `pm2:start` | `pm2 start ../ecosystem.config.js --env production` | Démarrage PM2 depuis `backend/` |
| `pm2:restart` | `pm2 restart kingshot-vikings-planner-api` | Redémarrage PM2 |

Le backend possède une première suite `node:test` exécutée via `tsx`. Aucun test frontend ou end-to-end n’est encore présent.

## 3. Architecture générale

```text
Navigateur
  -> Frontend React statique
  -> client API sur /api
  -> Backend Express
  -> routes + validation Zod
  -> services métier
  -> pool PostgreSQL
```

### 3.1 Dossiers structurants

| Chemin | Responsabilité |
| --- | --- |
| `frontend/` | Application React, types frontend, client API, styles et build Vite |
| `backend/` | API Express, validation, services et accès PostgreSQL |
| `db/init.sql` | Initialisation complète d’une nouvelle base |
| `db/migrations/` | Migrations de fonctionnalités pour une base existante |
| `deploy/` | Déploiement, bootstrap serveur, sauvegarde et template Nginx |
| `docs/` | Documentation d’exploitation et guide événement |
| `.github/workflows/` | CI et déploiement automatique |

### 3.2 Entrées principales

- `frontend/src/main.tsx` : monte `<App />` dans le DOM.
- `frontend/src/App.tsx` : shell, navigation hash, orchestration des données, session admin et composition des pages.
- `frontend/src/lib/api.ts` : client REST, headers admin, erreurs structurées et téléchargements CSV.
- `backend/src/index.ts` : teste PostgreSQL, exécute les contrôles de schéma puis démarre le serveur sur `HOST:PORT`.
- `backend/src/scripts/migrate.ts` : applique les migrations SQL sous verrou, avec transactions et checksums.
- `backend/src/server.ts` : configure Express, middleware et routeurs.
- `backend/src/db/pool.ts` : pool PostgreSQL construit depuis `DATABASE_URL`.
- `ecosystem.config.js` : processus PM2 `kingshot-vikings-planner-api`.
- `deploy/scripts/deploy.sh` : source de vérité du déploiement de production.

## 4. Navigation et pages frontend

La navigation est un routeur maison dans `frontend/src/App.tsx`, fondé sur `window.location.hash`. Les boutons mettent à jour l’état `appView`, puis `history.replaceState` écrit le hash. Les navigations ne créent donc pas une entrée d’historique à chaque clic.

| Vue | Hash principal | Composants majeurs | Accès |
| --- | --- | --- | --- |
| Home | `#home` | `AllianceHomePage` | Public |
| Planner | `#planner` | `StatsCards`, `RegistrationForm`, `FiltersBar`, `RegistrationList`, `EventWarningBanner` | Public ; suppression admin |
| Prep | `#prep` | `PreEventChecklistPanel`, `VikingWaveTimelinePanel`, résumé événement | Public et personnel |
| Auto Groups | `#groups` | `HqDefensePlannerPanel`, `ReinforcementGroupsPanel`, `StatsCards` | Public |
| Formations | `#formations` | `TroopFormationsPage` | Public et personnel ; reset global admin |
| Score | `#score` | `ScorePage` et panneaux analytiques | Public en lecture |
| Guide | `#guide` | `PreEventChecklistPanel`, `VikingWaveTimelinePanel`, `EventGuidePanel` | Public et personnel |
| Admin | `#admin` | `AdminPanel`, santé, exports, import, settings, archives | Page visible ; actions verrouillées |

`#troop-formations` est un alias de `#formations`. Tout hash inconnu retourne à Home. Il n’y a pas de React Router.

## 5. Architecture frontend

### 5.1 Orchestration

`frontend/src/App.tsx` conserve l’état central :

- inscriptions, partenaires, statistiques et filtres ;
- paramètres publics d’événement, guide et warning ;
- archives et données publiques de score ;
- session admin et expiration locale ;
- chargements, erreurs, confirmations et toasts ;
- vue active déterminée par le hash.

La recherche de pseudo utilise `frontend/src/hooks/useDebouncedValue.ts` avec un délai de 250 ms.

### 5.2 Composants structurants

- `frontend/src/components/AllianceHomePage.tsx` : accueil, raccourcis, état et liens communautaires.
- `frontend/src/components/RegistrationForm.tsx` : inscription et édition, partenaires, deux tiers et score personnel.
- `frontend/src/components/RegistrationList.tsx` : liste responsive, édition et suppression.
- `frontend/src/components/ReinforcementGroupsPanel.tsx` : calcul frontend des cellules de sept joueurs.
- `frontend/src/components/HqDefensePlannerPanel.tsx` : propositions waves 10 et 20.
- `frontend/src/components/TroopFormationsPage.tsx` : brouillons locaux, inventaire sparse par tier et allocation.
- `frontend/src/components/ScorePage.tsx` : agrège les vues d’archives, tendances et profils publics.
- `frontend/src/components/AdminPanel.tsx` : déverrouillage et actions principales.
- `frontend/src/components/ArchivesPanel.tsx` : édition et export des archives.
- `frontend/src/components/ToastStack.tsx` : notifications accessibles `aria-live`, maximum pratique de trois toasts.
- `frontend/src/components/ConfirmDialog.tsx` : confirmation des actions destructives.

### 5.3 Types et client API

- `frontend/src/types/registration.ts` : inscriptions, statistiques, archives et scores.
- `frontend/src/types/settings.ts` : warning, configuration événement et notes du guide.
- `frontend/src/types/formations.ts` : modèles et slots de formation.
- `frontend/src/lib/api.ts` : `API_BASE_URL`, sérialisation, `x-admin-token`, échange initial via `x-admin-password`, `ApiError` et `requestId`.

Les erreurs `5xx` affichent la référence `requestId` lorsqu’elle est fournie. Les erreurs réseau utilisent un message spécifique. Les erreurs Zod `400` remontent au plus deux messages de validation dans le texte principal.

### 5.4 Responsive, accessibilité et styles

- Approche mobile-first avec grilles Tailwind et changements aux breakpoints `sm`, `md`, `lg`, `xl`.
- `body` et `#root` ont `overflow-x: hidden` pour limiter les artefacts horizontaux.
- Les inputs, selects, boutons et textareas partagent les styles de `frontend/src/index.css`.
- Les nouveaux contrôles doivent conserver labels, `aria-label`, focus clavier et `aria-invalid` lorsque pertinent.
- Les icônes viennent de `lucide-react`.
- Le style existant est sombre, bleu nuit, ambre et cyan ; ne pas introduire un autre design system sans demande explicite.

### 5.5 Exports et copie Discord

- Les exports admin sont générés par le backend puis téléchargés comme `Blob` dans `App.tsx` et `api.ts`.
- Troop Formations génère son CSV localement dans `TroopFormationsPage.tsx` à partir du brouillon courant.
- `Copy Summary` utilise `navigator.clipboard.writeText` et copie l’allocation locale actuelle.
- L’API expose aussi un export CSV public du preset serveur, mais l’interface Troop Formations utilise son export local.

## 6. Architecture backend

### 6.1 Serveur et middleware

`backend/src/server.ts` applique, dans l’ordre :

1. `helmet()` ;
2. CORS sans credentials ;
3. `attachRequestId` ;
4. JSON limité à 1 Mo ;
5. Morgan ;
6. routeurs `/api/*` ;
7. réponse JSON 404 ;
8. `errorHandler`.

En production, Morgan écrit des lignes JSON contenant `timestamp`, `requestId`, méthode, URL, status, temps de réponse, taille, adresse distante et user-agent. En développement, le format Morgan `dev` est utilisé.

`backend/src/middleware/request-id.ts` conserve un `x-request-id` entrant uniquement s’il respecte le format UUID accepté par PostgreSQL ; toute autre valeur est remplacée par `randomUUID()`. Le header `x-request-id` effectivement utilisé est toujours renvoyé. `backend/src/middleware/error-handler.ts` traite séparément `ZodError`, `HttpError` et erreur interne.

### 6.2 Services métier

- `registration-service.ts` : lecture, filtres, statistiques, créations, éditions, suppressions, import et reset.
- `archive-service.ts` : archives, tendances personnelles et profils joueurs.
- `settings-service.ts` : configuration publique stockée dans `app_settings`.
- `formation-service.ts` : presets globaux et slots de formation.
- `audit-service.ts` : table et écritures d’audit.
- `schema-service.ts` : contrôles et ajouts idempotents au démarrage.
- `admin-token-service.ts` : émission et validation des tokens HMAC.

### 6.3 Routes publiques

| Méthode | Route | Responsabilité |
| --- | --- | --- |
| GET | `/api/health` | Santé API, PostgreSQL, version et métadonnées de déploiement |
| GET | `/api/registrations` | Liste filtrée par `search`, `partner`, `available` |
| GET | `/api/registrations/stats` | Statistiques selon les mêmes filtres |
| GET | `/api/registrations/partners` | Partenaires distincts |
| POST | `/api/registrations` | Création d’une inscription |
| PUT | `/api/registrations/:id` | Modification complète d’une inscription |
| GET | `/api/settings/event-warning` | Warning public |
| GET | `/api/settings/event-configuration` | Contexte événement public |
| GET | `/api/settings/guide-notes` | Notes publiques du guide |
| GET | `/api/scores/archives` | Résumés publics ; `eventLog` est masqué à `null` |
| GET | `/api/scores/personal-score-trends` | Évolution entre les deux dernières archives |
| GET | `/api/scores/player-profiles` | Profils agrégés sur les archives |
| GET | `/api/formations` | Résumés des presets globaux |
| GET | `/api/formations/:eventKey` | Preset global complet |
| GET | `/api/formations/:eventKey/export.csv` | Export du preset serveur |

Il n’existe pas de route backend dédiée à Auto Groups ou HQ Defense : ces calculs sont réalisés dans le frontend à partir des inscriptions chargées.

### 6.4 Routes protégées

`POST /api/admin/verify` passe par `requireAdminVerification`. Cette route accepte un mot de passe admin pour l’échange initial ou un token valide pour renouveler la session.

Toutes les autres routes suivantes passent par `requireAdmin` et exigent `x-admin-token` :

| Méthode | Route | Responsabilité |
| --- | --- | --- |
| DELETE | `/api/registrations/:id` | Suppression auditée |
| GET | `/api/admin/export.csv` | Export des inscriptions filtrées |
| GET | `/api/admin/stats` | Statistiques protégées, actuellement redondantes avec la route publique |
| GET | `/api/admin/archives` | Résumés complets des archives |
| GET | `/api/admin/archives/:id` | Détail avec snapshot des inscriptions |
| GET | `/api/admin/archives/:id/export.csv` | Export d’une archive |
| PATCH | `/api/admin/archives/:id` | Métadonnées, score, difficulté, log et stats manuelles |
| GET | `/api/admin/archives/personal-score-trends` | Tendances protégées |
| GET | `/api/admin/archives/player-profiles` | Profils protégés |
| GET | `/api/admin/archives/export.csv` | Export résumé des archives |
| GET | `/api/admin/archives/personal-scores.csv` | Export scores personnels |
| GET | `/api/admin/archives/event-notes.csv` | Export notes événement |
| POST | `/api/admin/import` | Import transactionnel de 1 à 100 inscriptions |
| PATCH | `/api/admin/settings/event-warning` | Modification auditée du warning |
| PATCH | `/api/admin/settings/event-configuration` | Modification auditée de l’événement |
| PATCH | `/api/admin/settings/guide-notes` | Modification auditée du guide |
| POST | `/api/admin/reset` | Archive puis vide la semaine courante, action auditée |
| PUT | `/api/formations/:eventKey/totals` | Modifie les totaux du preset global |
| POST | `/api/formations/:eventKey/slots` | Ajoute un slot global |
| PUT | `/api/formations/:eventKey/slots/:slotId` | Modifie et réordonne un slot global |
| DELETE | `/api/formations/:eventKey/slots/:slotId` | Supprime un slot global |
| POST | `/api/formations/:eventKey/reset` | Restaure le preset global codé dans le backend |

Dans l’interface actuelle, seule la réinitialisation du preset global Troop Formations est exposée. Les autres méthodes globales de formations existent dans l’API/client mais ne sont pas utilisées par une UI dédiée.

### 6.5 Validation

- Zod valide l’environnement, les query params, les UUID, les inscriptions, imports, archives, settings et formations.
- Les compteurs de formations globales sont bornés entre 0 et 1 milliard.
- Les erreurs de validation répondent `400` avec `issues` et `requestId`.
- Les requêtes SQL utilisent des paramètres PostgreSQL ; ne pas interpoler d’entrée utilisateur.

## 7. Authentification et administration

### 7.1 Flux actuel

1. L’utilisateur saisit un mot de passe sur la page Admin.
2. Le frontend appelle `POST /api/admin/verify` avec `x-admin-password`.
3. `requireAdminVerification` compare ce mot de passe à `ADMIN_PASSWORD` ou `ADMIN_SECONDARY_PASSWORD`.
4. Le backend émet un token temporaire : payload JSON base64url et signature HMAC-SHA256.
5. Le frontend envoie ensuite `x-admin-token` sur les routes protégées.
6. Au chargement suivant, le token local est revérifié via `/api/admin/verify`, qui émet un nouveau token.

### 7.2 Configuration et durée

- `ADMIN_PASSWORD` : obligatoire, 8 caractères minimum.
- `ADMIN_SECONDARY_PASSWORD` : optionnel, 8 caractères minimum.
- `ADMIN_TOKEN_SECRET` : optionnel dans le code, 16 caractères minimum s’il est présent ; fallback technique sur `ADMIN_PASSWORD`.
- `ADMIN_TOKEN_TTL_MINUTES` : expiration absolue du token serveur, 120 minutes par défaut.
- Le frontend impose séparément `ADMIN_SESSION_TIMEOUT_MINUTES = 20` comme délai d’inactivité glissant dans `App.tsx`.

Seul `requireAdminVerification`, utilisé par `/api/admin/verify`, accepte `x-admin-password`. Toutes les actions protégées utilisent `requireAdmin` et exigent ensuite un `x-admin-token` valide.

### 7.3 Stockage et expiration frontend

Le token est stocké dans `localStorage` sous la clé `kingshot-vikings-admin-session`. Cette clé ne contient jamais le mot de passe :

```json
{
  "schemaVersion": 2,
  "token": "<token signe>",
  "tokenExpiresAt": 0,
  "idleExpiresAt": 0
}
```

- `tokenExpiresAt` et `idleExpiresAt` sont des timestamps en millisecondes.
- `idleExpiresAt` est repoussé sur `pointerdown` ou `keydown`, sans dépasser `tokenExpiresAt`.
- L’ancienne clé `kingshot-vikings-admin-password` est lue une dernière fois, migrée vers la clé canonique si sa session est valide, puis supprimée.
- L’ancien format `{ token, expiresAt }` reste accepté et est normalisé vers le schéma v2 avant revérification serveur.
- Une valeur invalide, inactive ou expirée est supprimée.
- Le frontend verrouille après 20 minutes d’inactivité ou à l’expiration absolue du token, selon la première échéance.
- Une expiration serveur pendant une action produit une erreur `401`; il n’existe pas de verrouillage global automatique sur chaque `401`.

Ne jamais placer `ADMIN_PASSWORD`, `ADMIN_SECONDARY_PASSWORD` ou `ADMIN_TOKEN_SECRET` dans le frontend, un log, une capture ou un fichier versionné.

## 8. Base PostgreSQL

### 8.1 Tables actuelles

| Table | Rôle |
| --- | --- |
| `registrations` | Inscriptions de la semaine courante, partenaires JSONB, loadout JSONB et score personnel |
| `weekly_archives` | Snapshot JSONB du roster au reset, totaux, score alliance, difficulté, notes et stats manuelles |
| `app_settings` | Documents JSONB pour `event_warning`, `guide_notes`, `event_configuration` |
| `troop_formation_presets` | Modèles globaux Bear Trap, Vikings et Battle |
| `audit_logs` | Traces de suppressions, imports, reset et modifications de settings |
| `schema_migrations` | Historique des migrations appliquées et checksum SHA-256 |

Il n’existe pas de table `scores`. Le score personnel est une colonne de `registrations` puis une propriété des snapshots JSONB. Le score alliance est une colonne de `weekly_archives`.

### 8.2 Schéma, contraintes et index

`db/init.sql` :

- active `pgcrypto` pour `gen_random_uuid()` ;
- crée les six tables ;
- crée la fonction et les triggers `set_updated_at` pour `registrations`, `app_settings` et `troop_formation_presets` ;
- crée les index de pseudo, partenaire principal, disponibilité, audit, date d’archive, settings et formations ;
- laisse le backend créer et versionner les presets de formations lors de son démarrage.

Contraintes importantes :

- `registrations.troop_count >= 0` ;
- `registrations.troop_level` est borné entre 6 et 16 pour les nouvelles écritures ; la migration conserve sans modification d’éventuelles lignes historiques hors plage via une contrainte initialement `NOT VALID` ;
- `registrations.partner_names` et `registrations.troop_loadout` doivent être des tableaux JSONB pour les nouvelles écritures ; les lectures de partenaires remplacent défensivement une ancienne forme invalide par `[]` ;
- PostgreSQL impose aussi les formes top-level attendues pour les snapshots et stats d’archives, settings, presets de formations et métadonnées d’audit ; les normaliseurs backend restent la protection des contenus internes ;
- `personal_score` est positif ou nul ; l’API ajoute une borne à 1 milliard ;
- aucun identifiant externe ou nom de joueur n’est unique en base ;
- les tableaux JSONB ne possèdent pas de contrainte structurelle SQL.

### 8.3 Initialisation, migrations et démarrage

- Nouvelle installation : appliquer de préférence `db/init.sql` pour une initialisation explicite et reproductible.
- `db/migrations/2026-07-09_troop_formations.sql` crée et seed `troop_formation_presets` de manière idempotente.
- `db/migrations/2026-07-12_registration_troop_level.sql` conserve le changement historique qui avait introduit la contrainte T7-T16.
- `db/migrations/2026-07-16_registration_troop_t6.sql` remplace cette contrainte par la plage T6-T16 sans altérer les lignes historiques.
- `db/migrations/2026-07-12_z_registration_json_shapes.sql` impose progressivement les formes tableau de `partner_names` et `troop_loadout`.
- `db/migrations/2026-07-12_zz_shared_json_shapes.sql` impose progressivement les formes top-level des autres documents JSONB partagés.
- `db/migrations/2026-07-13_formation_template_state.sql` ajoute la version et l’état de personnalisation des presets partagés.
- `backend/src/scripts/migrate.ts` applique les fichiers `.sql` par ordre de nom, sous verrou PostgreSQL, avec une transaction par fichier.
- `schema_migrations` enregistre le nom, le checksum SHA-256 et la date d’application. Un checksum différent pour un fichier déjà appliqué bloque le déploiement.
- Au démarrage, `backend/src/services/schema-service.ts` peut créer le schéma applicatif complet sur une base vide, assure les index et triggers principaux, ajoute plusieurs colonnes manquantes et seed les presets.
- `backend/src/services/audit-service.ts` crée `audit_logs` et ses index.

Le contrôle de démarrage est idempotent et autonome sur une base vide. `db/init.sql` reste néanmoins la source SQL canonique et la procédure recommandée pour rendre l’initialisation visible lors d’une nouvelle installation.

Le script de déploiement exécute `npm run migrate` après le build backend et avant le redémarrage PM2. Pour tout nouveau changement de schéma, ajouter un nouveau fichier de migration, mettre à jour `db/init.sql`, décider explicitement si le bootstrap backend doit aussi l’appliquer, et ne jamais modifier une migration déjà enregistrée.

### 8.4 Templates Troop Formations

`backend/src/services/formation-service.ts` est l’unique source active des presets par défaut. `db/migrations/2026-07-09_troop_formations.sql` conserve seulement le snapshot historique v1 et ne doit jamais être modifié.

- `formationTemplateVersion` identifie la version courante des defaults.
- `template_version` mémorise la version appliquée à chaque preset partagé.
- `is_customized = true` protège un preset modifié par une route admin contre les mises à niveau automatiques.
- Un reset global restaure le default courant, met `is_customized = false` et réactive les futures mises à niveau.
- La première classification compare une empreinte SHA-256 du contenu normalisé avec les empreintes connues de la version enregistrée.
- Avant de modifier un default, conserver les empreintes de l’ancienne version dans `knownDefaultPresetFingerprints`, modifier le preset puis incrémenter `formationTemplateVersion`.

## 9. Règles métier principales

### 9.1 Inscriptions Viking Vengeance

- Types : `infantry`, `lancer`, `marksman`.
- Tiers API et UI : T6 à T16 inclus.
- Un joueur saisit un ou deux tiers distincts, avec jusqu’à trois types par tier, soit six lignes de loadout maximum.
- Chaque ligne doit avoir un compteur entre 1 et 100 000 000.
- `troopCount` et `troopLevel` sont dérivés côté backend : somme des lignes et tier maximum.
- Au moins un partenaire est requis.
- L’UI autorise cinq partenaires normalement, six si l’option `6 marches available` est activée.
- L’API accepte de un à six partenaires, déduplique sans tenir compte de la casse et prend le premier comme `partner_name` historique/principal.
- Le commentaire est optionnel et limité à 300 caractères.
- Le score personnel est optionnel, entier, compris entre 0 et 1 milliard.
- La disponibilité est un booléen.
- Création et modification : publiques. Suppression : admin.
- Le reset admin crée une archive uniquement si au moins une inscription existe, supprime la liste dans la même transaction et écrit un audit même si la liste est vide.

### 9.2 Auto Groups

`frontend/src/components/ReinforcementGroupsPanel.tsx` calcule des groupes de sept joueurs disponibles : un propriétaire et six partenaires de renfort.

- Les joueurs indisponibles sont exclus.
- Les filtres Planner actifs réduisent le pool transmis au calcul.
- La force normalisée est pondérée : 55 % nombre de troupes, 25 % meilleur tier, 20 % score personnel.
- Un score personnel absent reçoit une valeur neutre de 0,5 dans la formule normalisée.
- Les préférences mutuelles de partenaires réduisent le coût d’affectation et favorisent le même groupe.
- Les membres sont répartis pour équilibrer la force totale, puis triés par troupes et tier.
- Les rôles affichés sont `Cell anchor`, `Critical wave helper`, `Coverage partner` ou `March partner`.
- Les raisons affichent la complétude du groupe et les correspondances de préférences.

`frontend/src/components/HqDefensePlannerPanel.tsx` trie les joueurs disponibles par priorité et produit des suggestions séparées pour les waves 10 et 20 : anchors, support et backups. Ce sont des aides de planification, pas des affectations persistées.

### 9.3 Troop Formations

Implémentation principale : `frontend/src/components/TroopFormationsPage.tsx`.

- Presets : `battle`, `bear-trap`, `vikings`.
- Les presets globaux sont lus depuis PostgreSQL.
- Chaque joueur travaille sur une copie personnelle sans admin.
- Les brouillons sont séparés par événement et par navigateur.
- Types : Infantry, Lancer, Marksman.
- Tiers : T16 à T6, traités dans cet ordre.
- Available Troops utilise une structure **sparse** : le joueur ajoute uniquement les tiers nécessaires avec `Add tier`.
- Un même type ne peut pas contenir deux fois le même tier ; les options déjà utilisées sont retirées du select.
- Les lignes sont toujours affichées du meilleur tier au plus faible.
- Chaque slot contient nom, héros, besoins par type, notes et `sortOrder`.
- Les slots sont consommés dans leur ordre actuel.
- Pour chaque slot et chaque type, l’algorithme consomme T16 vers T6 jusqu’à satisfaire le besoin.
- Le reliquat demandé devient `shortage`.
- Les stocks non consommés composent le `remainder`, calculé automatiquement.
- Les ratios sont calculés sans division par zéro.
- `Copy Summary` et l’export CSV travaillent sur le brouillon local courant.
- `Reset my formation` supprime le brouillon local puis repart du preset serveur.
- Si l’admin est déverrouillé, `Reset shared template` appelle le reset global protégé.
- L’auto-save écrit à chaque modification significative.

Compatibilité locale :

- un ancien `availableTroopsByTier` dense T16-T7 est normalisé et les compteurs à zéro sont supprimés ;
- un format encore plus ancien `availableTroops` sans tiers est converti vers T7 ;
- les slots sont normalisés et réordonnés ;
- un JSON invalide ou sans tableau `slots` est ignoré au profit du preset serveur.

Exemple vérifié contre la boucle `allocateSlotsByTier` :

```text
Marksman disponibles :
T10 = 100
T9 = 100

Besoins :
J1 = 50
J2 = 50
J3 = 50
J4 = 50

Allocation attendue :
J1 = 50 T10
J2 = 50 T10
J3 = 50 T9
J4 = 50 T9
```

## 10. Persistance et sources de vérité

### 10.1 PostgreSQL

PostgreSQL contient les données globales et partagées :

- inscriptions de la semaine ;
- snapshots et scores archivés ;
- paramètres publics ;
- presets globaux Troop Formations ;
- audits.

### 10.2 localStorage

| Clé exacte | Contenu | Migration/fallback |
| --- | --- | --- |
| `kingshot-vikings-admin-session` | Session admin v2 : token, expiration absolue et expiration d’inactivité ; aucun mot de passe | Ancienne clé `kingshot-vikings-admin-password` et ancien format `{ token, expiresAt }` migrés automatiquement |
| `kingshot-vikings-pre-event-checklist` | Tableau d’identifiants cochés | Valeur invalide supprimée ; IDs inconnus non filtrés à la lecture |
| `troop-formations:battle` | Brouillon local Battle | Normalisation sparse et fallback preset |
| `troop-formations:bear-trap` | Brouillon local Bear Trap | Normalisation sparse et fallback preset |
| `troop-formations:vikings` | Brouillon local Vikings | Normalisation sparse et fallback preset |

Schéma courant d’un brouillon de formation :

```text
{
  availableTroopsByTier: {
    infantry: { "16": count, ... },
    lancer: { ... },
    marksman: { ... }
  },
  slots: FormationSlot[],
  savedAt: ISO date
}
```

Seule la session admin possède actuellement un `schemaVersion` explicite (`2`). La checklist et Troop Formations doivent toujours reconnaître leurs anciens champs sans numéro de version. Renommer une clé sans migration fait perdre l’accès apparent aux données locales. Les brouillons Troop Formations ne doivent jamais être envoyés comme document partagé global tant qu’il n’existe pas d’authentification par joueur.

### 10.3 Fichiers et ordre de priorité

Ordre à utiliser en cas de divergence :

1. code exécuté, `package.json`, lockfiles et configurations chargées ;
2. schéma PostgreSQL réellement requis par les services, `db/init.sql` et migrations ;
3. `deploy/scripts/deploy.sh`, puis `.github/workflows/deploy.yml` ;
4. `AI-CONTEXT.md` ;
5. README, ROADMAP et autres documents.

Sources canoniques particulières :

- Version frontend : `frontend/package.json`.
- Version API : `backend/package.json`.
- Presets runtime/reset : `backend/src/services/formation-service.ts` ; les anciennes migrations sont des snapshots immuables, pas des sources à resynchroniser.
- Déploiement : `deploy/scripts/deploy.sh`.
- Schéma neuf : `db/init.sql`.
- Détail des projets futurs : `ROADMAP.md`.

Il n’existe actuellement ni `CHANGELOG.md`, ni `package.json` racine. Les migrations sont suivies dans `schema_migrations` par nom de fichier et checksum, sans outil ORM externe.

## 11. Variables d’environnement

Ne jamais documenter ni copier une valeur réelle de production.

### 11.1 Backend

| Variable | Obligatoire | Défaut | Rôle |
| --- | --- | --- | --- |
| `NODE_ENV` | Non | `development` | `development`, `test` ou `production` ; sélectionne aussi le format de logs |
| `HOST` | Non | `127.0.0.1` | Adresse d’écoute Express ; conserver loopback en production derrière Nginx |
| `PORT` | Non | `4000` | Port HTTP Express |
| `DATABASE_URL` | Oui | Aucun | Chaîne PostgreSQL |
| `CORS_ORIGIN` | Non | `*` | Origine unique ou liste séparée par virgules |
| `ADMIN_PASSWORD` | Oui | Aucun | Mot de passe principal, min. 8 caractères |
| `ADMIN_SECONDARY_PASSWORD` | Non | Aucun | Deuxième mot de passe, min. 8 caractères |
| `ADMIN_TOKEN_SECRET` | Non dans le code | `ADMIN_PASSWORD` | Secret HMAC ; à définir explicitement en production, min. 16 caractères |
| `ADMIN_TOKEN_TTL_MINUTES` | Non | `120` | Durée serveur du token |
| `APP_DEPLOYED_AT` | Non | Métadonnée fichier | Override de la date de déploiement du health check |
| `APP_COMMIT_SHA` | Non | Métadonnée fichier | Override du commit du health check |

Les caractères réservés du mot de passe PostgreSQL dans `DATABASE_URL` doivent être percent-encodés. Par exemple, ne pas insérer brut `@`, `:`, `/`, `?`, `#` ou `%` dans la partie mot de passe.

### 11.2 Frontend

Ces variables sont intégrées au build et sont donc publiques :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Base du client REST |
| `VITE_DEV_API_TARGET` | `http://localhost:4000` | Cible du proxy Vite local uniquement |
| `VITE_DISCORD_URL` | URL Discord codée dans `App.tsx` | Lien communautaire |
| `VITE_PAYPAL_URL` | URL PayPal codée dans `App.tsx` | Soutien au projet |
| `VITE_KOFI_URL` | URL Ko-fi codée dans `App.tsx` | Soutien au projet |

### 11.3 Déploiement et sauvegarde

`deploy/scripts/deploy.sh` accepte notamment : `APP_DIR`, `FRONTEND_DIR`, `PM2_APP_NAME`, `BRANCH`, `BACKEND_ENV_FILE`, `FRONTEND_ENV_FILE`, `HEALTHCHECK_URL`, `API_BASE_URL`, `STATE_DIR`, `NVM_DIR`.

`deploy/scripts/backup-postgres.sh` accepte : `BACKEND_ENV_FILE`, `BACKUP_DIR`, `RETENTION_DAYS`.

Secrets GitHub Actions requis : `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_PRIVATE_KEY`, `VPS_SSH_KNOWN_HOSTS`, `VPS_APP_DIR`, `VPS_FRONTEND_DIR`.

## 12. Déploiement et production

### 12.1 Infrastructure attendue

- VPS OVH Debian 12.
- Source : `/opt/kingshot-vikings-planner`.
- Frontend publié : `/var/www/kingshot-vikings-planner`.
- Backend env : `/etc/kingshot-vikings-planner/backend.env`.
- Frontend env : `/etc/kingshot-vikings-planner/frontend.env`.
- Nginx actif : `/etc/nginx/sites-available/kingshot-vikings-planner`.
- PM2 : application `kingshot-vikings-planner-api`.
- Backend Express lié à `127.0.0.1:4000` par défaut via `HOST` et `PORT`.
- PostgreSQL natif.
- Production publique en HTTPS ; la configuration TLS active reste hors repo.

Le template `deploy/nginx/kingshot-vikings-planner.conf` écoute seulement en HTTP et utilise `vikings.example.com`. Il sert le SPA avec `try_files` et reverse-proxy `/api/` vers `http://127.0.0.1:4000`.

### 12.2 Flux canonique

`deploy/scripts/deploy.sh` est la source de vérité :

1. charge les profils shell et NVM/PATH ;
2. vérifie `git`, `node`, `npm`, `pm2`, `curl`, `rsync`, `sha256sum` ;
3. `git fetch origin main` ;
4. `git reset --hard origin/main` ;
5. `git clean -fd` ;
6. relie `backend/.env` au fichier serveur ;
7. installe les dépendances seulement si le hash des manifests change ;
8. build backend ;
9. exécute `npm run migrate`, puis écrit `backend/dist/deploy-info.json` ;
10. charge l’environnement frontend et build Vite ;
11. `rsync -a --delete` vers la racine Nginx ;
12. redémarre ou crée le processus PM2 et exécute `pm2 save` ;
13. retente le health check jusqu’à 15 fois avec 2 secondes d’intervalle ;
14. exécute les smoke tests de production.

Les fichiers suivis modifiés directement sur le VPS seront supprimés au prochain déploiement. Les fichiers persistants doivent rester hors repo. `backend/.env` est ignoré et relié au fichier `/etc`.

La clé GitHub Actions vers le VPS et la deploy key du VPS vers GitHub sont deux identités SSH différentes. La même identité Linux doit exécuter le déploiement SSH et posséder le processus PM2.

### 12.3 Health et smoke tests

`GET /api/health` vérifie PostgreSQL avec `SELECT 1` et renvoie : status, version, statut/latence DB, démarrage, uptime, date de déploiement et commit. Une DB indisponible produit `status: "degraded"` mais reste une réponse HTTP JSON ; le smoke test exige `status: "ok"`.

Smoke tests de `deploy.sh` :

- présence de `/var/www/kingshot-vikings-planner/index.html` ;
- `/api/health` avec status `ok` et version non vide ;
- `/api/registrations?available=true` retourne un tableau ;
- `/api/registrations/partners` retourne un tableau de chaînes.

### 12.4 Sauvegardes, logs et restauration

- `deploy/scripts/backup-postgres.sh` produit un dump compressé, permissions `600`, rétention 14 jours par défaut.
- Destination par défaut : `/var/backups/kingshot-vikings-planner`.
- L’automatisation cron est documentée mais n’est pas installée par le dépôt.
- La restauration PostgreSQL est manuelle avec `gunzip -c ... | psql ...`.
- PM2 logrotate est documenté (`10M`, 14 fichiers/jours selon module) mais pas installé automatiquement.
- Nginx s’appuie sur logrotate Debian.
- Aucun script de rollback applicatif automatisé n’existe. Un rollback de code nécessite de rétablir un commit sur `main` puis redéployer ; un rollback de données nécessite une restauration PostgreSQL contrôlée.

## 13. CI, tests et qualité

`.github/workflows/deploy.yml` se déclenche sur push de `main` et manuellement. Une concurrence unique annule le déploiement précédent en cours.

Le job `verify` exécute sur Ubuntu et Node 22 :

```bash
bash -n deploy/scripts/*.sh

cd backend
npm ci
npm run lint
npm run typecheck
npm run test
npm run build

cd ../frontend
npm ci
npm run lint
npm run typecheck
npm run build
```

Le contrôle `bash -n` valide la syntaxe de `deploy.sh`, `backup-postgres.sh` et `bootstrap-server-files.sh` avant toute connexion au VPS.

Le job `deploy` ne démarre qu’après succès de `verify`. Il valide les secrets, configure SSH, effectue un preflight distant, puis exécute `deploy/scripts/deploy.sh`.

Vérifications obligatoires avant livraison d’un changement applicatif :

```bash
cd backend
npm run typecheck
npm run lint
npm run test
npm run build

cd ../frontend
npm run typecheck
npm run lint
npm run build
```

Sous PowerShell avec une policy bloquant `npm.ps1`, utiliser `npm.cmd run ...`.

`backend/src/schemas/registration-schema.test.ts` couvre les bornes T6-T16, la limite de deux tiers, les doublons type/tier et la déduplication des partenaires. Aucun test frontend ou E2E n’est encore versionné ; les comportements non couverts doivent donc rester validés explicitement.

## 14. Versionnement

Sources actuelles :

- `frontend/package.json` -> UI via `frontend/src/lib/app-version.ts` ;
- `backend/package.json` -> API via `backend/src/config/app-version.ts` ;
- les deux `package-lock.json` doivent suivre ;
- `/api/health` expose la version backend ;
- le header de l’application expose la version frontend.

Règles attendues :

- **patch** : bugfix, compatibilité ou polish UX sans nouvelle capacité majeure ;
- **minor** : nouvelle fonctionnalité importante, nouvelle page ou nouveau module ;
- **major** : uniquement sur décision explicite ;
- maintenir les versions frontend/backend alignées sauf décision documentée ;
- ne pas incrémenter pour une modification documentaire seule sans demande ;
- ne pas créer de tag automatiquement ;
- ne pas créer de commit automatiquement sans demande explicite.

Aucun tag Git et aucun `CHANGELOG.md` ne sont présents au moment de cet audit.

## 15. Documentation existante

| Fichier | Rôle |
| --- | --- |
| `README.md` | Présentation publique, fonctionnalités, démarrage rapide et liens |
| `ROADMAP.md` | État détaillé des travaux terminés et futurs |
| `docs/SELF_HOSTING.md` | Installation locale et Debian 12 |
| `docs/DEPLOYMENT.md` | Déploiement manuel et GitHub Actions |
| `docs/OPERATIONS.md` | PM2, logs, Nginx, DB, sauvegarde et dépannage |
| `docs/VIKING_VENGEANCE_GUIDE.md` | Mécaniques et recommandations de l’événement, avec niveaux de confiance |
| `AI-CONTEXT.md` | Point d’entrée technique obligatoire pour agents IA |

Il n’existe pas de fichier de licence. Le README précise que le code n’est pas ouvertement licencié pour réutilisation ou redistribution.

## 16. Conventions de développement

- Travailler par changements incrémentaux et ciblés.
- Inspecter le code concerné avant de conclure à partir du README ou de la roadmap.
- Conserver `strict: true` et éviter `any`.
- Réutiliser les types, composants, helpers et services existants.
- Ne pas dupliquer une règle métier entre frontend et backend sans nécessité documentée.
- Préserver la compatibilité PostgreSQL et localStorage.
- Ajouter une migration idempotente et mettre à jour `db/init.sql` pour tout changement de schéma.
- Vérifier les anciens formats locaux avant de renommer une clé ou une propriété.
- Maintenir une UX mobile sans table large ni overflow horizontal.
- Préserver navigation clavier, labels, états de focus et attributs ARIA.
- Conserver le langage visuel Tailwind actuel.
- Garder Planner simple pour les joueurs occasionnels ; placer les outils avancés sur leurs pages dédiées.
- Maintenir la séparation public / personnel / admin.
- Ne jamais exposer de secret dans Vite, Git, les logs ou les réponses API.
- Une action destructive doit avoir confirmation, transaction lorsque nécessaire et audit si le domaine le prévoit.
- Ne pas modifier les fichiers serveur suivis directement en production.
- Mettre à jour `ROADMAP.md` à chaque commit fonctionnel lorsque son état change et aligner `README.md` seulement si nécessaire.

## 17. Pièges connus et divergences observées

1. **Presets partagés** : les brouillons joueurs doivent rester locaux. Écrire chaque frappe dans `troop_formation_presets` ferait s’écraser les utilisateurs.
2. **DATABASE_URL** : percent-encoder les caractères réservés du mot de passe.
3. **SSH non interactif** : `npm` et `pm2` peuvent manquer du PATH. `deploy.sh` et le preflight chargent profils et NVM ; conserver cette logique.
4. **Deux clés SSH** : GitHub Actions -> VPS n’est pas VPS -> GitHub. Diagnostiquer séparément.
5. **Git destructif en production** : `git reset --hard origin/main` et `git clean -fd` suppriment tout changement suivi/non suivi non ignoré sur le VPS.
6. **Identité PM2** : le deploy user doit être le même que le propriétaire du daemon PM2.
7. **Démarrage PM2** : le health check possède un retry 15 x 2 secondes ; ne pas le remplacer par un curl unique après restart.
8. **Édition publique** : toute personne connaissant un UUID d’inscription peut actuellement appeler le `PUT` public. Ne pas décrire l’édition comme protégée.
9. **Contenu JSONB interne** : PostgreSQL protège les types top-level, mais les propriétés internes des snapshots, stats, settings et presets restent validées et normalisées principalement par l’application.
10. **iPhone Chrome** : un crash/reload écran noir lors de la saisie des troupes a été corrigé mais reste à confirmer avec la joueuse concernée en production selon `ROADMAP.md`.
11. **Overflow responsive** : Score, header et navigation ont déjà subi des correctifs. Toute nouvelle table, nombre long ou rangée d’actions doit être testée sur mobile réel.
12. **HTTPS hors template** : la production publique est HTTPS, mais le certificat et les blocs TLS actifs ne sont pas dans le template Nginx du repo.
13. **Pas de service worker** : ne pas attribuer un problème de cache à un service worker sans nouvelle preuve ; aucun PWA/service worker n’est implémenté.
14. **Pas de rollback automatique** : sauvegarder la DB avant une migration et préparer la restauration manuelle.

## 18. Roadmap actuelle

`ROADMAP.md` reste la source détaillée.

### Terminé

- Planner Viking avec validation T6-T16, deux tiers, plusieurs partenaires et option six marches.
- Pages Home, Prep, Auto Groups, Formations, Score, Guide et Admin.
- Groupes automatiques de sept, rôles et HQ waves 10/20.
- Archives, scores, analytics, exports, settings et audit partiel.
- Déploiement SSH, CI lint/typecheck/build, smoke tests, sauvegarde et logs structurés.
- Troop Formations public avec drafts locaux, inventory sparse et allocation strongest-first.

### Validation encore ouverte

- Vérifier en production le correctif de la liste partenaires.
- Confirmer avec la joueuse concernée le correctif iPhone Chrome pendant la saisie des troupes.

### Prochaines priorités

- Navigation globale pensée pour plusieurs événements.
- Calendrier, annonces et page de guides d’alliance.
- Import/export de presets de formations et templates par rôle/phase.

### Évolution alliance hub

Le projet doit finir le polish Viking Vengeance avant d’ajouter Alliance Championship, Castle Battle, Bear/Pitfall, Alliance Mobilization, PvP et des analytics cross-event.

## 19. Checklist avant et après modification

### Avant

- [ ] Lire `AI-CONTEXT.md`.
- [ ] Vérifier `git status` et préserver les changements existants.
- [ ] Inspecter le code, les types et les routes concernés.
- [ ] Identifier la source de vérité réelle.
- [ ] Déterminer si PostgreSQL, JSONB ou localStorage sont touchés.
- [ ] Prévoir migration, fallback et rollback si le format change.
- [ ] Vérifier les anciens formats locaux et les données existantes.
- [ ] Définir si le comportement est public, personnel ou admin.

### Après

- [ ] Lancer lint, typecheck et build frontend/backend pour un changement applicatif.
- [ ] Tester desktop et mobile, y compris nombres longs et petites largeurs.
- [ ] Tester sans admin puis avec admin si la zone est concernée.
- [ ] Tester les méthodes API et erreurs touchées.
- [ ] Tester autosave, reload et reset local si localStorage change.
- [ ] Tester Copy Summary et CSV si leurs données changent.
- [ ] Vérifier la migration sur données existantes si PostgreSQL change.
- [ ] Vérifier `/api/health` et les smoke tests si backend/déploiement change.
- [ ] Vérifier `git diff --check` et les artefacts générés.
- [ ] Aligner version, package-lock, README, ROADMAP, docs et ce fichier lorsque pertinent.
- [ ] Ne déclarer que les vérifications réellement exécutées.

## 20. Workflow obligatoire des agents IA

Tout agent doit :

1. lire `AI-CONTEXT.md` avant de modifier le projet ;
2. inspecter le code concerné au lieu de se fier uniquement à la documentation ;
3. annoncer brièvement son plan ;
4. préserver les données et les changements existants ;
5. mettre à jour `AI-CONTEXT.md` lorsqu’un changement important rend ce contexte obsolète ;
6. mettre à jour README, ROADMAP et docs seulement lorsque pertinent ;
7. incrémenter la version selon l’importance du changement, sauf tâche documentaire sans accord ;
8. lancer toutes les vérifications disponibles et pertinentes ;
9. ne jamais commit, tag ou déployer automatiquement sans demande explicite ;
10. proposer un message de commit à la fin.

### Format obligatoire des futures réponses Codex

Toute réponse impliquant une modification doit se terminer par les blocs suivants.

### Version appliquée

```text
x.y.z
```

### Résumé

- fonctionnalités ajoutées ou corrigées ;
- éventuelles migrations ;
- points importants de compatibilité.

### Fichiers principaux modifiés

- chemins précis.

### Vérifications exécutées

```bash
commandes réellement exécutées
```

Ne jamais marquer une vérification comme réussie si elle n’a pas été exécutée.

### Action VPS requise

Inclure ce bloc uniquement si une action serveur est nécessaire :

```bash
commande de migration, modification env ou opération serveur
```

### Commit conseillé

```bash
git add .
git commit -m "type(scope): description"
```
