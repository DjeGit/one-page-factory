# Cache Cloudflare du HTML public (21/10/2026)

## Pourquoi
Les pages Tendpick sont rendues à chaque requête (`force-dynamic`). Un cache
de 5 minutes devant le serveur supprime le rendu à froid (~3 s) pour la quasi
totalité des visiteurs et des robots, et allège le serveur Hetzner.

## Ce que le code fait désormais
- `middleware.ts` n'envoie plus le cookie `opf_market` sur les pages publiques
  (plus aucun code ne le lisait). Un `Set-Cookie` sur chaque réponse empêche
  Cloudflare de mettre une page en cache.
- Pour une liste blanche de pages (accueil, /produits, /top-ventes, /c/*,
  /blog*, /guide-achat*, pages d'information), sans paramètre dans l'URL, le
  middleware propose `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
  Si Next.js réécrit cet en-tête sur une page dynamique, la règle Cloudflare
  ci-dessous reste valable : elle impose la durée sans dépendre du serveur.

## À faire dans Cloudflare (pour chacune des 3 zones : tendpick.fr, .es, .com)
Caching > Cache Rules > Create rule.

**Règle 1 — Mettre en cache le HTML public**
- Si : (http.request.method eq "GET") et (le chemin correspond à la liste ci-dessous) et (la chaîne de requête est vide)
  - chemin exact : `/`, `/produits`, `/top-ventes`, `/blog`, `/guide-achat`, `/a-propos`, `/methode`, `/contact`, `/partenariats`, `/mentions-legales`, `/politique-confidentialite`
  - commence par : `/c/`, `/blog/`, `/guide-achat/`
- Alors : Éligible au cache = Oui ; Edge TTL = « Ignorer l'en-tête cache-control et utiliser ce TTL » = 5 minutes ; Browser TTL = « Respecter l'origine » (ou 0).

Expression prête à coller (mode « Modifier l'expression ») :

```
(http.request.method eq "GET" and http.request.uri.query eq "" and
 (http.request.uri.path in {"/" "/produits" "/top-ventes" "/blog" "/guide-achat" "/a-propos" "/methode" "/contact" "/partenariats" "/mentions-legales" "/politique-confidentialite"}
  or starts_with(http.request.uri.path, "/c/")
  or starts_with(http.request.uri.path, "/blog/")
  or starts_with(http.request.uri.path, "/guide-achat/")))
```

**Règle 2 — Ne jamais mettre en cache le reste** (facultative, par sécurité)
- Si : le chemin commence par `/api/`, `/admin`, `/preview` ou `/bio`
- Alors : Éligible au cache = Non (Bypass).

Les fiches produit (`/<slug>`) ne sont volontairement pas dans la liste : le
code gère un test A/B par visiteur (cookie `ab_*`) qu'un cache partagé
fausserait. On pourra les ajouter plus tard s'il n'y a aucun test actif.

## Vérifier
```
curl -sI https://tendpick.fr/blog | grep -iE "cf-cache-status|age|cache-control|set-cookie"
```
- 1er appel : `cf-cache-status: MISS` (ou EXPIRED) ; 2e appel : `HIT` et un en-tête `age`.
- Il ne doit y avoir aucun `set-cookie` sur ces pages.
- `/produits?q=test` doit rester `DYNAMIC` / `BYPASS`.

## Après un déploiement
Une page modifiée peut rester ancienne jusqu'à 5 minutes. Pour forcer :
Caching > Configuration > Purge Cache > Purge Everything (sur la zone concernée).
Un purge automatique dans `deploy.sh` demanderait un jeton d'API Cloudflare : à
décider avant de l'ajouter.

## Attention
- Ne pas activer « Cache Everything » sur toute la zone : cela mettrait en cache
  `/api/*` (redirections d'affiliation `/api/go/*`, leads, suivi).
- Les pixels (Meta, TikTok, GTM) et la bannière cookies sont gérés côté
  navigateur : le cache n'y change rien.
