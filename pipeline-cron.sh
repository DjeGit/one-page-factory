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

SITE_URL="http://localhost:3000"  # local direct — évite de repasser par le domaine public (bug identifié sur le serveur)
SECRET="${PIPELINE_SECRET:-${ADMIN_SECRET:-}}"
CRON_SECRET="${INTERNAL_CRON_SECRET:-${PIPELINE_SECRET:-${ADMIN_SECRET:-}}}"
MARKET="${MARKET:-fr}"
ACTION="${1:-run}"
LOG_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$LOG_DATE] Starting pipeline action: $ACTION"

case "$ACTION" in
  run)
    curl -s -X POST "$SITE_URL/api/pipeline/run" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"dry_run\": false, \"max_products\": 5, \"market\": \"$MARKET\"}" \
      | python3 -c "
import sys, json
data = json.load(sys.stdin)
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
    curl -s -X POST "$SITE_URL/api/auto-optimize" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      -d '{"dry_run": false}' \
      | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Paused:', data.get('paused'), '| Scale flagged:', data.get('scale_flagged'), '| OK:', data.get('ok'))
"
    ;;

  discover)
    curl -s -X POST "$SITE_URL/api/pipeline/discover" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"threshold\": 60, \"dry_run\": false, \"max_import\": 10, \"market\": \"$MARKET\"}" \
      | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('Scraped:', data.get('total_scraped'), '| Candidates:', data.get('candidates'), '| Imported:', data.get('imported'))
"
    ;;

  dry-run)
    curl -s -X POST "$SITE_URL/api/pipeline/run" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"dry_run\": true, \"max_products\": 5, \"market\": \"$MARKET\"}" \
      | python3 -m json.tool
    ;;

  market-refresh)
    echo "Refreshing market data for: $MARKET"
    curl -s -X POST "$SITE_URL/api/market/refresh" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      -d "{\"market\": \"$MARKET\"}" \
      | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    print('Market:', data.get('market'), '| Products:', data.get('count'), '| Sources used:', ', '.join(data.get('sourcesUsed', [])))
else:
    print('Refresh skipped:', data.get('error'))
"
    ;;

  exchange-rates)
    echo "Refreshing exchange rates"
    curl -s -X POST "$SITE_URL/api/cron/exchange-rates" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('results', []):
    if 'rate' in r:
        print('EUR ->', r['currency'], ':', r['rate'])
    else:
        print('Error for', r['currency'], ':', r.get('error'))
"
    ;;

  social-publish)
    curl -s -X POST "$SITE_URL/api/cron/social-publish" \
      -H "Authorization: Bearer $CRON_SECRET" \
      -H "Content-Type: application/json" \
      | python3 -c "
import sys, json
data = json.load(sys.stdin)
n = data.get('processed', 0)
if n:
    print('Posts published:', n)
    for p in data.get('posts', []):
        print(' -', p['id'], ':', p['status'])
"
    ;;

  *)
    echo "Usage: $0 {run|optimize|discover|dry-run|market-refresh|exchange-rates|social-publish}"
    exit 1
    ;;
esac

echo "[$LOG_DATE] Done."
