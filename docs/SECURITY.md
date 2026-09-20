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

`app/api/admin/login/route.ts` applique un rate-limiting en mémoire
(5 tentatives / 15 min par IP) et pose un cookie de session `httpOnly`.
2FA (TOTP) non implémenté à ce jour — à considérer si le nombre d'admins
augmente.

## En cas de fuite suspectée

1. Roter immédiatement la clé/le mot de passe concerné à la source
   (dashboard du fournisseur), jamais seulement dans `.env.local`.
2. Vérifier `git log --all -- <chemin>` pour confirmer si le secret a été
   commité à un moment — si oui, la rotation est obligatoire même après
   suppression du fichier (l'ancien secret reste dans l'historique git tant
   qu'il n'est pas explicitement purgé).
3. Mettre à jour `.env.local` (local + serveur) avec la nouvelle valeur,
   redémarrer le process (`pm2 restart opf --update-env`).
