-- Sprint 0 sécurité — Activer Row Level Security sur toutes les tables.
--
-- Constat (vérifié dans le code, sept. 2026) : TOUTES les routes de l'app
-- (y compris les pages publiques Tendpick.com et /go/[code]) passent par
-- getSupabaseAdmin() = la clé service_role, jamais par le client anon côté
-- client. Donc rien dans l'app ne dépend aujourd'hui de l'accès anon.
--
-- Mais la clé NEXT_PUBLIC_SUPABASE_ANON_KEY est par nature publique (déjà
-- visible en clair dans un fichier local avant ce sprint), et Supabase
-- expose une API REST (PostgREST) directement sur la base au travers de
-- cette clé. Sans RLS, un simple appel HTTP avec la clé anon donnerait un
-- accès total en lecture/écriture à toutes les tables, indépendamment du
-- code de l'app. RLS est donc le vrai filet de sécurité ici, pas une
-- ceinture-bretelles optionnelle.
--
-- Politique retenue : verrouillage complet du rôle anon (aucune policy =
-- aucun accès), puisque rien dans l'app n'en a besoin aujourd'hui. Le rôle
-- service_role continue de tout voir (il bypass RLS par construction côté
-- Supabase). Si un jour une lecture publique côté client devient
-- nécessaire, ajouter une policy SELECT ciblée (ex. products WHERE
-- active = true) dans une migration dédiée plutôt que de rouvrir ce
-- verrouillage par défaut.

ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clicks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views       ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_leads      ENABLE ROW LEVEL SECURITY;

-- Aucune policy créée pour anon/authenticated : RLS activée + 0 policy =
-- deny-by-default pour tout rôle autre que service_role. C'est voulu.

-- Vérification après application (à exécuter dans le SQL editor Supabase,
-- ou via l'API REST avec la clé anon) :
--   select * from products;   -- doit renvoyer 0 ligne / erreur avec la clé anon
--   select * from clicks;     -- idem
