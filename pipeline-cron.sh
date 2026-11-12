#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# One Page Factory — Pipeline Cron
#
# Appelle l'orchestrateur complet toutes les nuits à 3h00,
# l'auto-optimize tous les jours à 9h00, et rafraîchit l'étude de marché
# (Sprint 4) toutes les 6h, PAR MARCHÉ, décalées de quelques minutes pour
# ne pas cogner toutes les sources en même temps.
#
# Installation (sur le serveur Hetzner, en root) :
#   chmod +x /var/www/one-page-factory/pipeline-cron.sh
#   crontab -e
#   # Coller les lignes ci-dessous :
#   0 3 * * *      /var/www/one-page-factory/pipeline-cron.sh run >> /var/log/opf-pipeline.log 2>&1
#   0 9 * * *      /var/www/one-page-factory/pipeline-cron.sh optimize >> /var/log/opf-pipeline.log 2>&1
#   0 */6 * * *    MARKET=fr /var/www/one-page-factory/pipeline-cron.sh market-refresh >> /var/log/opf-market.log 2>&1
#   5 */6 * * *    MARKET=es /var/www/one-page-factory/pipeline-cron.sh market-refresh >> /var/log/opf-market.log 2>&1
#   10 */6 * * *   MARKET=uk /var/www/one-page-factory/pipeline-cron.sh market-refresh >> /var/log/opf-market.log 2>&1
#   30 4 * * *     /var/www/one-page-factory/pipeline-cron.sh exchange-rates >> /var/log/opf-market.log 2>&1
#   * * * * *      /var/www/one-page-factory/pipeline-cron.sh social-publish >> /var/log/opf-social.log 2>&1
#   15 4 * * *     /var/www/one-page-factory/pipeline-cron.sh purge-visits >> /var/log/opf-market.log 2>&1
#   */10 * * * *   /var/www/one-page-factory/pipeline-cron.sh trend-worker >> /var/log/opf-trend-worker.log 2>&1
#   30 4 * * 1     /var/www/one-page-factory/pipeline-cron.sh trend-search >> /var/log/opf-trend-search.log 2>&1
#   45 4 * * 1     /var/www/one-page-factory/pipeline-cron.sh video-backfill >> /var/log/opf-video.log 2>&1
#
# trend-worker : flux automatique du OUI de la page Tendance (scripts/pipeline/worker.mjs). Il lit .env.local lui-même
# (node --env-file), prend un verrou (/tmp/opf-trend-worker.lock, partagé avec deploy.sh : pas de passage pendant un
# déploiement, jamais deux passages en même temps) et s'arrête de force au bout de 27 minutes. Un passage « rien à faire »
# n'écrit qu'une ligne. Essais à la main : ./pipeline-cron.sh trend-worker --id <aliexpress_id> --dry-run
# Journaux : prévoir une rotation (logrotate) de /var/log/opf-*.log, ils grossissent à chaque passage.
#
# trend-search : recherche hebdomadaire des produits tendance (scripts/pipeline/trend-search.mjs), le lundi à 4h30 (heure du serveur).
# Remplit la page Tendance de la semaine (10 produits par catégorie, prix FR/ES/UK) et envoie un e-mail. N'écrit jamais deux fois la même
# semaine (--force pour refaire). Essai sans écriture : ./pipeline-cron.sh trend-search --dry-run [--category tech]
# video-backfill : cherche une vidéo YouTube pour les fiches qui n'en ont pas (scripts/pipeline/video-backfill.mjs). État : ./pipeline-cron.sh video-backfill --status
#
# market-refresh et exchange-rates utilisent INTERNAL_CRON_SECRET (ou, à
# défaut, PIPELINE_SECRET puis ADMIN_SECRET) — cf. .env.example.
# market-refresh n'écrit rien si aucune source de données n'est activée
# pour ce marché dans Admin > Paramètres > Intégrations. exchange-rates
# alimente exchange_rates (Sprint 5, coût/gain UK en GBP) via
# frankfurter.app, gratuit, sans clé. social-publish (module de publication
# programmée, 18/09) tourne toutes les minutes — c'est le prix à payer pour
# qu'un post programmé à une heure précise parte à quelques dizaines de
# secondes près ; il ne fait rien (retourne processed:0) tant qu'aucun post
# n'est dû, donc pas de souci de charge à cette fréquence.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# Secrets : déjà dans l'environnement (crontab) sinon lus dans .env.local, le même fichier que start.sh.
if [ -z "${PIPELINE_SECRET:-}${ADMIN_SECRET:-}${INTERNAL_CRON_SECRET:-}" ] && [ -f "$APP_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$APP_DIR/.env.local"
  set +a
fi

SITE_URL="http://localhost:3000"  # local direct — évite de repasser par le domaine public (bug identifié sur le serveur)
SECRET="${PIPELINE_SECRET:-${ADMIN_SECRET:-}}"
CRON_SECRET="${INTERNAL_CRON_SECRET:-${PIPELINE_SECRET:-${ADMIN_SECRET:-}}}"
MARKET="${MARKET:-fr}"
ACTION="${1:-run}"
LOG_DATE=$(date '+%Y-%m-%d %H:%M:%S')

case "$MARKET" in
  fr|es|uk) ;;
  *) echo "[$LOG_DATE] MARKET invalide : « $MARKET » (attendu : fr, es ou uk)"; exit 1 ;;
esac

# Jamais deux passages de la même action en même temps (un appel lent ne doit pas s'empiler toutes les minutes).
LOCK="/tmp/opf-cron-${ACTION}-${MARKET}.lock"
[ "$ACTION" = "trend-worker" ] && LOCK="/tmp/opf-trend-worker.lock"
[ "$ACTION" = "trend-search" ] && LOCK="/tmp/opf-trend-search.lock"
[ "$ACTION" = "video-backfill" ] && LOCK="/tmp/opf-video-backfill.lock"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "[$LOG_DATE] $ACTION : un passage est déjà en cours (ou un déploiement), celui-ci est ignoré."
  exit 0
fi

# POST vers le site local : délai maximal, message clair si le site est arrêté ou en cours de redémarrage (déploiement).
# Usage : out=$(call /api/... "$SECRET" '{"json":1}') ; affiche la réponse sur stdout.
call() {
  local path="$1" secret="$2" body="${3:-}" out
  local args=(-sS --connect-timeout 5 --max-time 900 -X POST "$SITE_URL$path" -H "Authorization: Bearer $secret" -H "Content-Type: application/json")
  [ -n "$body" ] && args+=(-d "$body")
  if ! out=$(curl "${args[@]}" 2>&1); then
    echo "Site injoignable ou trop lent ($path) : $out" >&2
    return 1
  fi
  printf '%s' "$out"
}

# Affiche la réponse JSON avec le script Python donné ; si elle n'est pas du JSON (erreur 401/500, page HTML), le dit en clair.
# Usage : show_json "$out" '<script python lisant `data`>'
show_json() {
  local raw="$1" code="$2"
  printf '%s' "$raw" | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except ValueError:
    print('Réponse illisible du site (pas du JSON) :', raw[:200].replace(chr(10), ' '))
    sys.exit(1)
if isinstance(data, dict) and data.get('error') and 'success' not in data and len(data) <= 2:
    print('Le site a refusé la demande :', data.get('error'))
    sys.exit(1)
$code
"
}

# trend-worker : lignes d'en-tête propres, pas de bannière « Starting »/« Done » (le worker écrit son propre journal).
if [ "$ACTION" != "trend-worker" ] && [ "$ACTION" != "trend-search" ] && [ "$ACTION" != "video-backfill" ]; then
  echo "[$LOG_DATE] Starting pipeline action: $ACTION"
fi

case "$ACTION" in
  run)
    out=$(call /api/pipeline/run "$SECRET" "{\"dry_run\": false, \"max_products\": 5, \"market\": \"$MARKET\"}") || exit 1
    show_json "$out" "
print('Duration:', data.get('duration_ms'), 'ms')
r = data.get('results', {})
if 'discover' in r:
    d = r['discover']
    print('Discover — scraped:', d.get('total_scraped'), '| imported:', d.get('imported'))
if 'generate' in r:
    g = r['generate']
    print('Generate — generated:', g.get('generated'), '| errors:', g.get('errors'))
if 'activate' in r:
    a = r['activate']
    print('Activate — activated:', a.get('activated'))
if 'optimize' in r:
    o = r['optimize']
    print('Optimize — paused:', o.get('paused'), '| scale_flagged:', o.get('scale_flagged'))
"
    ;;

  optimize)
    out=$(call /api/auto-optimize "$SECRET" '{"dry_run": false}') || exit 1
    show_json "$out" "print('Paused:', data.get('paused'), '| Scale flagged:', data.get('scale_flagged'), '| OK:', data.get('ok'))"
    ;;

  discover)
    out=$(call /api/pipeline/discover "$SECRET" "{\"threshold\": 60, \"dry_run\": false, \"max_import\": 10, \"market\": \"$MARKET\"}") || exit 1
    show_json "$out" "print('Scraped:', data.get('total_scraped'), '| Candidates:', data.get('candidates'), '| Imported:', data.get('imported'))"
    ;;

  dry-run)
    out=$(call /api/pipeline/run "$SECRET" "{\"dry_run\": true, \"max_products\": 5, \"market\": \"$MARKET\"}") || exit 1
    printf '%s' "$out" | python3 -m json.tool
    ;;

  market-refresh)
    echo "Refreshing market data for: $MARKET"
    out=$(call /api/market/refresh "$CRON_SECRET" "{\"market\": \"$MARKET\"}") || exit 1
    show_json "$out" "
if data.get('success'):
    print('Market:', data.get('market'), '| Products:', data.get('count'), '| Sources used:', ', '.join(data.get('sourcesUsed', [])))
else:
    print('Refresh skipped:', data.get('error'))
"
    ;;

  exchange-rates)
    echo "Refreshing exchange rates"
    out=$(call /api/cron/exchange-rates "$CRON_SECRET") || exit 1
    show_json "$out" "
for r in data.get('results', []):
    if 'rate' in r:
        print('EUR ->', r['currency'], ':', r['rate'])
    else:
        print('Error for', r['currency'], ':', r.get('error'))
"
    ;;

  social-publish)
    # Toutes les minutes : si le site redémarre (déploiement), on le dit sans erreur ; le passage suivant rattrapera.
    out=$(call /api/cron/social-publish "$CRON_SECRET") || { echo "Publication sociale ignorée ce coup-ci."; exit 0; }
    show_json "$out" "
n = data.get('processed', 0)
if n:
    print('Posts published:', n)
    for p in data.get('posts', []):
        print(' -', p['id'], ':', p['status'])
"
    ;;

  purge-visits)
    echo "Purging visitor analytics older than 13 months"
    out=$(call /api/cron/purge-visits "$CRON_SECRET") || exit 1
    echo "$out"
    ;;

  trend-worker)
    NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
    if [ -z "$NODE_BIN" ]; then
      echo "[$LOG_DATE] trend-worker : node introuvable (définir NODE_BIN ou PATH dans la crontab)"
      exit 1
    fi
    cd "$APP_DIR"
    if [ ! -f .env.local ]; then
      echo "[$LOG_DATE] trend-worker : .env.local introuvable dans $APP_DIR"
      exit 1
    fi
    # 27 min au plus (le worker s'arrête de lui-même à 25) : un service qui ne répond plus ne bloque pas les passages suivants.
    timeout --kill-after=30 1620 "$NODE_BIN" --env-file=.env.local scripts/pipeline/worker.mjs "${@:2}"
    exit $?
    ;;

  trend-search|video-backfill)
    NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
    if [ -z "$NODE_BIN" ]; then
      echo "[$LOG_DATE] $ACTION : node introuvable (définir NODE_BIN ou PATH dans la crontab)"
      exit 1
    fi
    cd "$APP_DIR"
    if [ ! -f .env.local ]; then
      echo "[$LOG_DATE] $ACTION : .env.local introuvable dans $APP_DIR"
      exit 1
    fi
    echo "[$LOG_DATE] $ACTION"
    # 27 min au plus : un service qui ne répond plus ne bloque pas la semaine suivante.
    timeout --kill-after=30 1620 "$NODE_BIN" --env-file=.env.local "scripts/pipeline/${ACTION}.mjs" "${@:2}"
    exit $?
    ;;

  *)
    echo "Usage: $0 {run|optimize|discover|dry-run|market-refresh|exchange-rates|social-publish|purge-visits|trend-worker [options]|trend-search [options]|video-backfill [options]}"
    exit 1
    ;;
esac

echo "[$LOG_DATE] Done."
