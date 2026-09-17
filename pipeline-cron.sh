#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# One Page Factory — Pipeline Cron
#
# Appelle l'orchestrateur complet toutes les nuits à 3h00
# et l'auto-optimize tous les jours à 9h00.
#
# Installation (sur le serveur Hetzner, en root) :
#   chmod +x /var/www/one-page-factory/pipeline-cron.sh
#   crontab -e
#   # Coller les deux lignes ci-dessous :
#   0 3 * * * /var/www/one-page-factory/pipeline-cron.sh run >> /var/log/opf-pipeline.log 2>&1
#   0 9 * * * /var/www/one-page-factory/pipeline-cron.sh optimize >> /var/log/opf-pipeline.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SITE_URL="http://localhost:3000"
SECRET="${PIPELINE_SECRET:-${ADMIN_SECRET:-}}"
ACTION="${1:-run}"
LOG_DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$LOG_DATE] Starting pipeline action: $ACTION"

case "$ACTION" in
  run)
    curl -s -X POST "$SITE_URL/api/pipeline/run" \
      -H "Authorization: Bearer $SECRET" \
      -H "Content-Type: application/json" \
      -d '{"dry_run": false, "max_products": 5}' \
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
      -d '{"threshold": 60, "dry_run": false, "max_import": 10}' \
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
      -d '{"dry_run": true, "max_products": 5}' \
      | python3 -m json.tool
    ;;

  *)
    echo "Usage: $0 {run|optimize|discover|dry-run}"
    exit 1
    ;;
esac

echo "[$LOG_DATE] Done."
