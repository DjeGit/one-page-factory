#!/usr/bin/env bash
# Déploiement OPF (à lancer sur le serveur, dans /var/www/one-page-factory) :
#   ./deploy.sh
# git pull (sans fusion) -> npm ci si les dépendances ont changé -> build -> rechargement pm2 -> réchauffement des 3 domaines.
#
# Sûreté :
#  - le site n'est redémarré QU'APRÈS un build réussi ; si le build échoue, le script s'arrête et le site continue de tourner
#    (l'ancien dossier .next est remis en place) ;
#  - un seul déploiement à la fois (verrou), et le worker des produits (pipeline-cron.sh trend-worker) ne démarre pas pendant
#    le git pull / le build : les deux utilisent le même verrou /tmp/opf-trend-worker.lock ;
#  - pm2 relit ecosystem.config.js à chaque déploiement (nouvelles variables de .env.local prises en compte) ;
#  - si le site ne répond pas après le redémarrage, le script le dit et sort en erreur (code 1) au lieu de conclure « OK » ;
#  - rappel des migrations SQL ajoutées par ce déploiement (à appliquer dans Supabase : le code peut en dépendre).
# Le site est indisponible quelques secondes pendant le redémarrage (un seul processus Next.js). Pour une coupure nulle il faudrait
# passer pm2 en mode cluster, ou construire dans un autre dossier (distDir dans next.config.js) puis le basculer.
set -euo pipefail
cd "$(dirname "$0")"

# Un seul déploiement à la fois.
exec 8>/tmp/opf-deploy.lock
flock -n 8 || { echo "Un déploiement est déjà en cours."; exit 1; }

# Le worker des produits est peut-être en train de tourner (jusqu'à 25 min) : on attend son tour, puis on garde le verrou jusqu'à la fin.
exec 9>/tmp/opf-trend-worker.lock
echo "Attente de la fin du worker des produits (10 min au plus)…"
flock -w 600 9 || { echo "Le worker des produits tourne encore : réessaie dans quelques minutes."; exit 1; }

BEFORE=$(git rev-parse HEAD)
git pull --ff-only origin main
AFTER=$(git rev-parse HEAD)
CHANGED=$(git diff --name-only "$BEFORE" "$AFTER" || true)

if [ ! -d node_modules ] || echo "$CHANGED" | grep -qx 'package-lock.json'; then
  echo "Dépendances modifiées : npm ci"
  npm ci
fi

# Sauvegarde légère du dossier .next (copie par liens, instantanée) pour revenir en arrière si le build échoue.
rm -rf .next.prev
[ -d .next ] && cp -al .next .next.prev
if ! npm run build; then
  echo "ÉCHEC du build : le site n'a PAS été redémarré."
  if [ -d .next.prev ]; then
    rm -rf .next
    mv .next.prev .next
    echo "L'ancienne version (.next) a été remise en place."
  fi
  exit 1
fi
rm -rf .next.prev

# Le worker peut repartir dès maintenant. Les verrous sont aussi fermés pour pm2 : s'il lance son démon ici, il ne doit pas les hériter
# (sinon ils resteraient pris indéfiniment et plus aucun worker ni déploiement ne démarrerait).
flock -u 9
exec 9>&-

# startOrReload relit ecosystem.config.js (donc .env.local) ; « pm2 restart opf --update-env » ne le fait pas.
pm2 startOrReload ecosystem.config.js --only opf --update-env 8>&-
pm2 save >/dev/null 8>&-

# Attendre que Next réponde (30 s max)
UP=0
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/ || true)
  if [ "$code" = "200" ]; then UP=1; break; fi
  sleep 1
done
if [ "$UP" != "1" ]; then
  echo "ERREUR : le site ne répond pas après le redémarrage (dernier code : ${code:-aucun})."
  echo "Voir les journaux : pm2 logs opf --lines 80   — retour arrière : git checkout $BEFORE && ./deploy.sh"
  pm2 list 8>&-
  exit 1
fi

for h in tendpick.fr tendpick.es tendpick.com; do
  for p in / /blog /produits /top-ventes; do
    code=$(curl -s -o /dev/null -w '%{http_code} %{time_total}s' --max-time 30 -H "Host: $h" "http://localhost:3000$p" || true)
    echo "warm $h$p -> $code"
  done
done

NEW_MIGRATIONS=$(echo "$CHANGED" | grep '^supabase/migrations/' || true)
if [ -n "$NEW_MIGRATIONS" ]; then
  echo
  echo "À APPLIQUER dans Supabase (SQL Editor) si ce n'est pas déjà fait :"
  echo "$NEW_MIGRATIONS" | sed 's/^/  - /'
fi

pm2 list 8>&-
