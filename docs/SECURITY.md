# Sécurité — One Page Factory

Ce document décrit **où** vivent les secrets de ce projet et comment les faire
circuler correctement. Il ne contient **aucune valeur réelle** — si un secret
apparaît un jour en clair dans ce dépôt, c'est un incident à traiter
immédiatement (rotation + retrait de l'historique git).

## Où vivent les secrets

| Environnement | Emplacement | Remarques |
|---|---|---|
| Développement local (Mac) | `.env.local` (racine du projet) | Jamais commité (`.gitignore`). Recopier depuis `.env.example` et remplir avec les vraies valeurs, obtenues auprès des dashboards des fournisseurs (Supabase, Anthropic, etc.), jamais partagées par chat/email. |
| Production (Hetzner) | `/var/www/one-page-factory/.env.local` (hors dépôt git, permissions restreintes sur le serveur) | Chargé par `ecosystem.config.js` via `dotenv`, puis filtré par `ENV_ALLOWLIST` avant d'être transmis au process Next.js par PM2. |
| Accès serveur | Clé SSH dédiée (pas de mot de passe) | Ne jamais loguer, coller dans un fichier du dépôt, ou transmettre par chat. |
| GitHub | Remote `origin` en HTTPS **sans token dans l'URL** | Le push/pull s'authentifie via le credential helper git local de chaque machine (jamais un token embarqué dans `.git/config`). |

## Règle d'or

**Toute nouvelle variable d'environnement doit être ajoutée à trois endroits**,
sinon elle est silencieusement ignorée en production :

1. `.env.example` — avec un commentaire expliquant son rôle et où l'obtenir.
2. `.env.local` (local **et** serveur) — avec la vraie valeur.
3. `ecosystem.config.js` → `ENV_ALLOWLIST` — sinon PM2 ne la transmet pas au
   process Next.js même si elle est présente dans `.env.local`.

## Registre d'intégrations (Sprint 3)

Chaque source de données marché et chaque canal de diffusion sociale est
double-gated :
- un toggle `enabled` en base (`table integrations`), configurable depuis
  `/admin/settings/integrations` ;
- **et** la présence de la clé d'environnement correspondante côté serveur.

Une intégration désactivée en base, ou dont la clé d'env est absente, ne
déclenche aucun appel réseau sortant — voir `lib/integrations/registry.ts`.
Les clés elles-mêmes ne sont jamais stockées en base, seulement le statut
`enabled`/`disabled`.

## Base de données (Supabase)

RLS (Row Level Security) est activée sur `products`, `market_products`,
`ab_tests`, `clicks`, `page_views`, `email_leads`
(`supabase/migrations/20260918000001_enable_rls.sql`), ainsi que sur
`integrations` (Sprint 3), `invoices` et `invoice_number_sequences`
(Sprint 2, `20260918000007_invoices.sql`) et `scheduled_posts` (Sprint 4,
`20260920000002_scheduled_posts.sql`) — même politique : service_role
uniquement, aucun accès anon/authenticated. La clé
`SUPABASE_SERVICE_ROLE_KEY` contourne RLS et ne doit **jamais** être exposée
côté client (`NEXT_PUBLIC_*`) ni committée. Si `SUPABASE_SERVICE_ROLE_KEY`
est absente côté serveur, `getSupabaseAdmin()` (`lib/supabase.ts`) retombe
sur la clé anon et le signale bruyamment dans les logs — RLS bloque alors
la quasi-totalité des opérations admin (échecs, pas de fuite).

## Authentification admin

- **Cookie `admin_auth`** = sha256(`ADMIN_SECRET` + `ADMIN_SALT`), posé par
  `app/api/admin/login/route.ts` (`httpOnly`). Vérifié par
  `isAuthorizedRequest()` (`lib/admin-auth.ts`) à temps constant.
- **Automates (cron, n8n, scripts)** : `Authorization: Bearer <secret>` avec
  `INTERNAL_CRON_SECRET`, `PIPELINE_SECRET` ou `ADMIN_SECRET`. Les routes
  historiques « Keepa » (`/api/sync/*`, `/api/scores/*`) utilisent
  `INTERNAL_API_KEY` ; `/api/weekly-report` accepte le cookie admin **ou**
  cette clé (`isAuthorizedAdminOrInternal`).
- **`ADMIN_SECRET` est obligatoire en production** : s'il est absent, l'accès
  admin est refusé (échec fermé) et la connexion répond 503. Avant, une valeur
  par défaut connue (`changeme`) était utilisée — n'importe qui pouvait se
  connecter. La valeur par défaut n'existe plus qu'en développement/test.
- **Anti force brute** : 5 tentatives / 15 min par IP, plus un plafond global
  de 200 échecs / 15 min (rotation d'IP). Limiteurs en mémoire (un seul
  processus PM2) ; l'IP vient de `cf-connecting-ip` (Cloudflare), puis
  `x-real-ip`, puis `x-forwarded-for`.
- 2FA (TOTP) non implémenté à ce jour — à considérer si le nombre d'admins
  augmente.

## Conventions des routes API (`app/api/**`)

Règles à respecter pour toute nouvelle route (outils communs dans
`app/api/_lib/` — dossier préfixé `_`, jamais exposé comme route) :

1. **Authentification d'abord** : toute route d'administration commence par
   `if (!isAuthorizedRequest(req)) return unauthorized();`. Seules sont
   publiques : `GET /api/health`, `GET /api/feeds/google-merchant`,
   `GET /api/go/[code]` (redirection affiliée), `POST /api/leads` (inscription),
   `POST /api/analytics` (vues), `POST /api/visit`, `POST /api/track/click`,
   `POST /api/ab-test/track`, `GET /api/ab-test/variant/[slug]`,
   `POST /api/admin/login|logout`, `POST /api/market-preference`.
   Une route publique n'expose jamais de donnée sensible (e-mails, chiffres
   d'affaires, clés) et limite les colonnes lues.
2. **Valider avant la base** : corps JSON illisible → 400 (`readJsonObject`),
   identifiants en UUID (`isUuid`), marché `fr|es|uk` (`isValidMarket`),
   bornes sur les nombres, tailles sur les textes, URLs en `http(s)`. Jamais de
   saisie dans un filtre PostgREST `.or()` sans validation.
3. **Erreurs** : jamais de 200 en cas d'échec ; statut juste (400, 404, 409,
   502…) ; le texte brut de Postgres ou d'un fournisseur (IA, e-mail) n'est pas
   renvoyé (`dbErrorResponse`, `aiErrorResponse`) — il est écrit dans les logs.
4. **Public = limité** : les routes publiques qui écrivent en base ont un
   limiteur (`createRateLimiter`).
5. **Fiches produit** : tout passage par l'API valide la fiche avec
   `validateProductInput()` (`_lib/product-input.ts`) — marché, lien http(s),
   livraison gratuite booléenne, vidéo YouTube, identifiant AliExpress en
   chiffres, taux de commission en fraction 0–1.
6. **Un `route.ts` n'exporte que ses méthodes HTTP** (GET, POST…) : exporter
   un utilitaire casse `next build`. Le code partagé va dans `_lib/`.
7. **Pipeline automatique** (`/api/pipeline/run`) : ne génère et ne publie que
   les fiches `product_source = 'auto_discovered'`, et uniquement avec un vrai
   lien d'achat et une photo. Les brouillons manuels et ceux du pipeline
   « tendances » ne sont jamais publiés par lui.

## En cas de fuite suspectée

1. Roter immédiatement la clé/le mot de passe concerné à la source
   (dashboard du fournisseur), jamais seulement dans `.env.local`.
2. Vérifier `git log --all -- <chemin>` pour confirmer si le secret a été
   commité à un moment — si oui, la rotation est obligatoire même après
   suppression du fichier (l'ancien secret reste dans l'historique git tant
   qu'il n'est pas explicitement purgé).
3. Mettre à jour `.env.local` (local + serveur) avec la nouvelle valeur,
   redémarrer le process (`pm2 restart opf --update-env`).
