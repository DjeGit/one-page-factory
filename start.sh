#!/bin/bash
# Démarrage manuel du site (secours : en production, pm2 lance Next.js via ecosystem.config.js).
set -eo pipefail
cd /var/www/one-page-factory
if [ ! -f .env.local ]; then
  echo "ERREUR : /var/www/one-page-factory/.env.local introuvable : le site démarrerait sans ses clés."
  exit 1
fi
# Charger toutes les vars du .env.local dans l'environnement
set -a
source /var/www/one-page-factory/.env.local
set +a
exec node_modules/.bin/next start -p 3000
