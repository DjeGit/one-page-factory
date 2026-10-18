#!/usr/bin/env bash
# Déploiement OPF (à lancer sur le serveur, dans /var/www/one-page-factory) :
#   ./deploy.sh
# git pull -> build -> restart pm2 -> réchauffement des 3 domaines.
# Le réchauffement évite que le premier visiteur paie le rendu à froid (~3 s).
set -euo pipefail
cd "$(dirname "$0")"

git pull origin main
npm run build
pm2 restart opf --update-env

# Attendre que Next réponde (30 s max)
for i in $(seq 1 30); do
  curl -s -o /dev/null http://localhost:3000/ && break
  sleep 1
done

for h in tendpick.fr tendpick.es tendpick.com; do
  for p in / /blog /produits /top-ventes; do
    code=$(curl -s -o /dev/null -w '%{http_code} %{time_total}s' -H "Host: $h" "http://localhost:3000$p")
    echo "warm $h$p -> $code"
  done
done

pm2 list
