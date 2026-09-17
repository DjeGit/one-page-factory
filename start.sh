#!/bin/bash
cd /var/www/one-page-factory
# Charger toutes les vars du .env.local dans l'environnement
set -a
source /var/www/one-page-factory/.env.local
set +a
exec node_modules/.bin/next start -p 3000
