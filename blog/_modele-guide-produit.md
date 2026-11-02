# Modèle — guide d'achat par produit (gros articles)

Un guide par produit = 1 article par marché (fr / es / uk), catégorie `guides-achat`,
publié sous `/guide-achat/<slug>`. Il apparaît automatiquement dans la grille
« Autres guides d'achat » de la page `/guide-achat`. Aucun code à modifier.

Fichiers : `blog/guides-achat/guides-achat_<date>_<n>-<slug>.md` (fr),
`blog/es/guides-achat/…` (es), `blog/en/guides-achat/…` (en, marché `uk`),
et un `blog/import-blog-guide-<produit>.sql` (modèle : `import-blog-guides-achat.sql`).

## Structure (1 800 à 2 500 mots)
1. Titre H1 : « <Produit> : le guide d'achat 2026 » (mot-clé en tête, < 60 caractères).
2. Introduction (80-120 mots) : pour qui, ce que le lecteur saura à la fin, mention « produits non testés par Tendpick ».
3. **L'essentiel en 30 secondes** : 4 à 6 points (réponse courte, bon pour l'extrait Google).
4. Les critères qui comptent (spécifications expliquées simplement, avec les valeurs seuils).
5. Les types / gammes de produits et à qui chacun convient (pas de prix affichés).
6. Les erreurs fréquentes et les pièges (faux avis, accessoires incompatibles, garanties).
7. Où et comment acheter en sécurité (renvoi vers `/guide-achat`, garantie légale, retours).
8. FAQ (5 à 6 questions réelles, réponses de 40-70 mots).
9. Notre sélection : liens vers les fiches produit Tendpick (`linked_product_ids`).
10. Sources citées (fabricants, associations de consommateurs, textes de loi).

## Règles
- Aucun prix chiffré (conformité Amazon Associates), pas de promesse non vérifiable, pas de « testé par nous ».
- Chaque fait technique ou légal vérifié sur une source primaire, citée en fin d'article.
- 4 à 6 photos Pexels (1600 px de large, `alt` descriptif), couverture = 1re photo.
- `meta_title` ≤ 60 caractères, `meta_description` 120-155 caractères.
- 3 langues rédigées pour leur marché (pas de traduction mot à mot), slugs traduits.
- Liens internes : vers `/guide-achat`, la catégorie produit concernée et 1 à 2 articles du blog.
- Import en `draft`, relecture, puis publication dans l'admin.
