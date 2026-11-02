-- Import du guide d'achat général « bonnes pratiques d'achat en ligne » en BROUILLON — préparé le 21/10/2026.
-- 3 articles (fr, es, uk), un par site, rédigés pour leur marché. À coller dans Supabase > SQL Editor.
-- Rien n'est publié : chaque article est créé en statut « draft », avec couverture et images Pexels,
-- dans la catégorie « guides-achat » ; à relire puis publier depuis /admin/blog.
-- Relancer ce script est sans danger (ON CONFLICT DO NOTHING).
BEGIN;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$acheter-sur-internet-en-securite-guide$q$, 'fr', $q$Acheter sur internet en sécurité : le guide 2026$q$, $q$Vérifier un site, repérer les faux avis, payer en sécurité, connaître ses droits de rétractation et de garantie : les bons réflexes pour acheter en ligne sans se tromper.$q$, $q$*Transparence : Tendpick perçoit une commission si vous achetez via certains liens présents sur le site, sans surcoût pour vous. Ce guide général a été rédigé avec l'aide d'une IA, relu par un humain, et s'appuie uniquement sur des sources publiées, listées en fin de page. Il ne remplace pas un conseil juridique. Sources vérifiées le 21 octobre 2026.*

Acheter en ligne est devenu un réflexe, et les arnaques aussi. Un faux site, un faux avis ou un « prix barré » trompeur peuvent coûter cher, alors qu'une poignée de vérifications suffit le plus souvent à s'en protéger. Voici les bons réflexes, dans l'ordre où ils servent : avant de commander, au moment de payer, puis si quelque chose tourne mal. Les règles et les chiffres cités viennent d'organismes publics (Bercy, DGCCRF, Service-public, Commission européenne, douane, Cybermalveillance.gouv.fr) et sont datés. Pour tout le reste, la logique est la même que pour nos [guides par produit](/blog?category=guides-achat) : vérifier avant d'acheter, pas après.

## Avant d'acheter : vérifier qui vend vraiment

Le premier réflexe est de savoir à qui l'on a affaire. Sur un site marchand sérieux, vous devez trouver sans effort le nom de l'entreprise, son adresse, un moyen de la contacter et des mentions légales complètes. La DGCCRF, qui détaille la marche à suivre sur economie.gouv.fr, invite à contrôler l'adresse du site, ses mentions légales, ses avis et son mode de paiement avant de commander.

Quelques gestes simples aident :

- Tapez vous-même l'adresse du site plutôt que de cliquer sur un lien reçu par e-mail, SMS ou réseau social.
- Cherchez le nom du site accompagné du mot « arnaque » : les signalements remontent vite.
- Ne vous fiez pas à l'extension : un « .fr » ne prouve pas qu'une société est française, rappelle Bercy.
- Préférez un vendeur établi en France ou dans l'Union européenne : les recours contre un vendeur hors UE aboutissent moins souvent.

Sur une place de marché (marketplace), regardez aussi qui vend et qui expédie, et si le vendeur est un professionnel ou un particulier : vos droits ne sont pas les mêmes. C'est un conseil qui revient dans presque tous les guides consultés.

## Les signaux d'alerte d'un faux site

Un site frauduleux est souvent imitable à l'identique d'un site légitime : c'est l'accumulation d'indices qui doit alerter. Bercy et l'INC en citent plusieurs :

- Un nom de domaine qui ne correspond pas à la marque, avec des fautes, des tirets ou des ajouts bizarres.
- Un prix trop bas pour être honnête.
- Des mentions légales floues ou absentes, aucun service client joignable.
- Des « labels de confiance » qui ne mènent nulle part quand on clique dessus.
- Un français approximatif et des messages qui pressent (« plus que 2 articles », minuteur, offre qui expire).

![Ordinateur portable affichant une icône de cadenas de sécurité sur une table](https://images.pexels.com/photos/4973899/pexels-photo-4973899.jpeg?auto=compress&cs=tinysrgb&w=1600)

Autre idée reçue : le cadenas à côté de l'adresse ne garantit pas que le site est honnête. Le magazine britannique Which? rappelle qu'il prouve seulement que la connexion est chiffrée, pas que le vendeur est digne de confiance. Enfin, méfiez-vous des messages qui vous poussent à agir vite (colis bloqué, remboursement, compte suspendu) : Cybermalveillance.gouv.fr recommande de ne pas cliquer sur des liens reçus de cette façon et de passer par le site officiel.

## Comparer sans se faire piéger : prix total, prix barrés et promotions

Le prix affiché n'est pas le prix payé. Comparez toujours le total à la fin du panier : livraison, options, frais annexes, et frais éventuels de douane pour un vendeur hors UE. La DGCCRF le rappelle : les options payantes pré-cochées sont interdites sans votre accord, donc décochez ce que vous n'avez pas choisi.

Pour les promotions, la règle est plus protectrice que ce que l'on croit. Depuis le 28 mai 2022, toute réduction annoncée doit indiquer le prix le plus bas pratiqué dans les 30 jours précédents, d'après la DGCCRF (fiche mise à jour le 25 août 2026). Un prix barré qui compare avec les prix d'autres vendeurs n'est pas une réduction au sens de la loi : le commerçant doit alors préciser à quoi il se compare.

![Smartphone posé près d'une calculatrice et de lunettes sur un bureau](https://images.pexels.com/photos/8970686/pexels-photo-8970686.jpeg?auto=compress&cs=tinysrgb&w=1600)

Pour prendre du recul, Which? cite des outils de suivi de l'historique des prix comme PriceSpy ou Pricerunner. Nous ne les avons pas testés : utilisez-les comme un repère, pas comme une vérité. Et gardez le bon réflexe : si vous voulez un produit précis, relevez son prix à l'avance, plusieurs jours avant une période de promotions, pour savoir si l'offre est réellement intéressante. C'est aussi pour cette raison que Tendpick n'affiche pas de prix sur ses fiches : ils changent plus vite que les articles.

## Avis en ligne : comment les lire

Les avis aident à choisir, à condition de les lire avec méthode. Publier de faux avis ou modifier de vrais avis est une pratique commerciale déloyale, passible de deux ans de prison et de 300 000 € d'amende, indique Bercy (page du 7 janvier 2025). Les professionnels doivent aussi informer sur la manière dont ils contrôlent les avis et sur les éventuelles contreparties offertes aux auteurs. La DGCCRF a toutefois constaté des abus : suppression d'avis négatifs, publication plus rapide des avis positifs.

Pour vous y retrouver :

- Lisez surtout les avis moyens (trois étoiles) : ils sont souvent les plus détaillés.
- Méfiez-vous des avis publiés en rafale à la même date ou rédigés presque à l'identique : Which? signale ces avis groupés comme un signe suspect.
- Cherchez des avis ailleurs que sur le site du vendeur (presse spécialisée, forums, sites d'avis indépendants).
- Relativisez une note parfaite avec très peu d'avis.

## Payer en sécurité

Au moment de payer, vérifiez que l'adresse commence par https, que le bouton final indique clairement l'obligation de payer (« commande avec obligation de paiement », en deux clics selon la DGCCRF) et que le montant débité sera bien celui affiché. Depuis 2021, l'authentification forte de la directive européenne DSP2 est obligatoire pour la plupart des paiements en ligne : elle demande un second élément de confirmation, le plus souvent une validation dans l'application de votre banque, d'après MoneyVox (mise à jour du 11 septembre 2026).

![Personne tenant une carte bancaire devant un ordinateur portable pour un achat en ligne](https://images.pexels.com/photos/5717969/pexels-photo-5717969.jpeg?auto=compress&cs=tinysrgb&w=1600)

Quelques précautions complémentaires :

- La DGCCRF indique que les cartes virtuelles ou prépayées limitent les risques : elles évitent de communiquer le numéro de votre carte principale.
- N'enregistrez pas vos coordonnées bancaires dans le navigateur ou sur les sites : c'est la position de la CNIL, rapportée par Bercy.
- Évitez le virement vers un vendeur inconnu : Which?, le NCSC britannique et Get Safe Online le déconseillent, car il est très difficile de récupérer l'argent.
- Ne communiquez jamais un code reçu par SMS ou par application à quelqu'un qui vous le demande.

## Acheter hors de l'Union européenne : TVA, douane et recours

Un prix attractif sur un site hors UE peut cacher des frais supplémentaires. D'après la douane française (fiche du 6 novembre 2025), la TVA de 20 % s'applique dès le premier euro, il n'y a pas de droits de douane jusqu'à 150 €, et les frais du transporteur sont libres : ils ne dépendent pas de la douane et sont parfois facturés après la livraison. Exemple donné par la douane : un article à 200 € avec 7 € de port revient à environ 260 € à la livraison.

À cela s'ajoute une nouveauté. Depuis le 1er juillet 2026, un droit de douane de 3 € par catégorie tarifaire s'applique aux colis de 150 € ou moins venant de pays tiers, selon la Commission européenne (29 juin 2026). Il doit être déclaré et payé par le vendeur ou l'importateur ; l'effet sur le prix final pour l'acheteur n'est pas précisé dans la source que nous avons consultée. Retenez surtout que les recours sont plus difficiles quand le vendeur est hors UE : à prix égal, privilégiez un vendeur européen.

## Après la commande : garder les preuves

Conservez la confirmation de commande, les e-mails échangés, les captures d'écran de l'annonce et le justificatif de paiement. Bercy et l'INC recommandent de tout garder, car ces éléments vous serviront en cas de litige. Vérifiez aussi que le montant prélevé correspond à votre commande.

![Livreur remettant des colis à une cliente devant sa porte](https://images.pexels.com/photos/6995138/pexels-photo-6995138.jpeg?auto=compress&cs=tinysrgb&w=1600)

À la livraison, la DGCCRF conseille de refuser un colis abîmé, ou au minimum d'écrire des réserves sur le bon de livraison. Ces quelques secondes simplifient beaucoup une réclamation ultérieure.

## Vos droits : rétractation de 14 jours et garantie légale

**Le droit de rétractation.** Pour une vente à distance, vous disposez d'au moins 14 jours sans avoir à donner de motif. Pour un bien, le délai court à partir de la réception. Attention : il faut prévenir le vendeur, car renvoyer le colis ne suffit pas, et le bien doit être renvoyé dans les 14 jours qui suivent la notification (Service-public). Le vendeur doit vous rembourser sous 14 jours après avoir été informé de votre décision, frais de livraison initiaux compris et par le même moyen de paiement. Les frais de retour sont à votre charge, sauf si le vendeur ne vous avait pas informé ou accepte de les prendre.

![Mains ouvrant un colis en carton](https://images.pexels.com/photos/27200515/pexels-photo-27200515.jpeg?auto=compress&cs=tinysrgb&w=1600)

Quelques achats sont exclus : biens personnalisés, produits périssables, produits descellés pour des raisons d'hygiène, contenus numériques déjà lancés, hébergement, transport et loisirs à date fixe. Si le vendeur ne vous a pas informé de ce droit, le délai peut être prolongé de 12 mois au plus.

**La garantie légale de conformité.** Elle dure deux ans, pour le neuf comme pour l'occasion (Bercy, page du 9 septembre 2026). Pendant 24 mois pour un produit neuf, et 12 mois pour une occasion, le défaut est présumé exister dès la vente : c'est au vendeur de prouver le contraire. Le vendeur est seul responsable, sans vous renvoyer vers le fabricant. Il doit réparer ou remplacer le bien sous 30 jours au maximum, à défaut vous pouvez obtenir un remboursement ou une réduction du prix. Une réparation prolonge la garantie d'un an. Depuis le 31 juillet 2026, un droit à la réparation auprès du fabricant s'applique aussi après la garantie pour certains produits, dont les smartphones, les téléviseurs, les lave-linge et les aspirateurs.

## En cas de problème : service client, médiateur, SignalConso

Voici l'ordre conseillé par la DGCCRF et l'INC :

1. Contactez le service client, puis confirmez votre réclamation par courrier recommandé.
2. Saisissez le médiateur de la consommation du vendeur. C'est gratuit, après une réclamation écrite restée sans réponse satisfaisante ou sans réponse sous deux mois, dans l'année qui suit la réclamation. Son avis est rendu sous 90 jours et vous pouvez le refuser.
3. Rapprochez-vous d'une association de consommateurs.
4. Signalez le problème sur SignalConso : le signalement est transmis à l'entreprise et alimente les contrôles de la DGCCRF, sans garantie de règlement individuel.
5. En dernier recours, saisissez la justice civile.

Si vous soupçonnez une fraude à la carte, prévenez aussi votre banque rapidement.

## Questions fréquentes

**Comment savoir si un site est fiable ?**
Contrôlez les mentions légales, l'adresse exacte du site, le nom du site associé au mot « arnaque » et la cohérence des prix. Un seul signe ne suffit pas : c'est l'ensemble qui compte.

**Quel moyen de paiement est le plus sûr sur internet ?**
Une carte, idéalement virtuelle ou prépayée, avec authentification forte. Évitez le virement vers un inconnu.

**Combien de temps pour se rétracter après un achat en ligne ?**
Au moins 14 jours à partir de la réception d'un bien, sans motif, à condition d'en informer le vendeur. Certains achats sont exclus.

**Que faire si je n'ai pas reçu mon colis ?**
Contactez d'abord le vendeur, gardez vos preuves, puis suivez l'ordre habituel : médiateur de la consommation, SignalConso, association de consommateurs. Prévenez votre banque s'il s'agit d'une fraude.

**Les avis en ligne sont-ils fiables ?**
Pas toujours. Lisez les avis moyens, repérez les avis groupés ou trop similaires, et cherchez des avis indépendants hors du site du vendeur.

**Quelle garantie sur un produit acheté en ligne ?**
La garantie légale de conformité de deux ans, avec présomption de défaut de 24 mois pour le neuf et de 12 mois pour l'occasion.

**Faut-il acheter hors de l'Union européenne ?**
Cela peut valoir le coup, mais la TVA, les frais du transporteur et le nouveau droit de 3 € par catégorie peuvent effacer l'économie, et les recours sont plus difficiles. Comparez le total, pas le prix affiché.

**Comment signaler un site frauduleux ?**
Sur SignalConso, et auprès de votre banque si vous avez payé. Gardez les captures d'écran et les e-mails.

## À retenir

Vérifiez le vendeur avant tout, méfiez-vous des prix trop bas et des messages qui pressent, payez avec une carte (virtuelle si possible), gardez les preuves et connaissez vos deux droits clés : 14 jours pour vous rétracter, deux ans de garantie légale. Si vous préparez un achat précis, parcourez [notre sélection](/produits) ou nos [meilleures ventes](/top-ventes), en gardant ces réflexes en tête.

## Sources

- DGCCRF / Bercy, « Achats en ligne : comment vérifier la fiabilité d'un site », 17 novembre 2025 : https://www.economie.gouv.fr/particuliers/mes-droits-conso/bien-consommer/achats-en-ligne-comment-verifier-la-fiabilite-dun-site
- DGCCRF, « Comment réaliser des achats sur internet de façon sécurisée », 13 novembre 2024 : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/comment-realiser-des-achats-sur-internet-de-facon-securisee
- Bercy, « Vente à distance : droit de rétractation », 19 juin 2026 : https://www.economie.gouv.fr/particuliers/vente-distance-droit-retractation
- Service-public.gouv.fr, droit de rétractation, vérifié le 1er janvier 2026 : https://www.service-public.gouv.fr/particuliers/vosdroits/F10485?lang=fr
- Bercy, « Garantie légale de conformité », 9 septembre 2026 : https://www.economie.gouv.fr/particuliers/garantie-legale-conformite
- Bercy / DGCCRF, « Peut-on faire confiance aux avis en ligne ? », 7 janvier 2025 : https://www.economie.gouv.fr/particuliers/mes-droits-conso/bien-consommer/peut-faire-confiance-aux-avis-en-ligne
- DGCCRF, « Annonces de réduction de prix », 25 août 2026 : https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/annonces-de-reduction-de-prix-ce-que-vous-devez-savoir
- Bercy, médiation de la consommation, FAQ : https://www.economie.gouv.fr/mediation-conso/foire-aux-questions
- Douane française, « Anticiper les frais de douane d'un colis », 6 novembre 2025 : https://www.douane.gouv.fr/fiche/anticiper-les-frais-de-douane-dun-colis
- Commission européenne, droit de douane de 3 € sur les petits colis, 29 juin 2026 : https://commission.europa.eu/news-and-media/news/ensuring-fairness-and-safety-eur3-customs-duty-low-value-parcels-2026-06-29_fr
- Cybermalveillance.gouv.fr, « 10 mesures essentielles pour assurer sa sécurité numérique », mise à jour du 5 octobre 2026 : https://www.cybermalveillance.gouv.fr/tous-nos-contenus/bonnes-pratiques/10-mesures-essentielles-assurer-securite-numerique
- MoneyVox, « Authentification forte », mise à jour du 11 septembre 2026 : https://www.moneyvox.fr/banque/authentification-forte.php
- INC, « Comment éviter les arnaques en ligne », 16 mars 2026 : https://www.inc-conso.fr/content/comment-eviter-les-arnaques-en-ligne-avec-familles-de-france
- Which?, « How to spot a fake, fraudulent or scam website », 7 août 2026 : https://www.which.co.uk/consumer-rights/advice/how-to-spot-a-fake-fraudulent-or-scam-website-aUBir8j8C3kZ
- NCSC, « Shopping and paying safely online » : https://www.ncsc.gov.uk/guidance/shopping-online-securely

Photos : Kindel Media, Dan Nelson, Kaboompics, Leeloo The First et Berna, sur Pexels (licence Pexels : usage libre).
$q$, $q$https://images.pexels.com/photos/7007174/pexels-photo-7007174.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$achat en ligne$q$, $q$sécurité$q$, $q$arnaques$q$, $q$faux site$q$, $q$droit de rétractation$q$, $q$garantie légale$q$, $q$faux avis$q$, $q$paiement sécurisé$q$, $q$guide d'achat$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$guides-achat$q$), '{}', NULL, $q$Acheter sur internet en sécurité : le guide 2026$q$, $q$Vérifier un site, repérer les faux avis, payer en sécurité, rétractation et garantie : le guide pour acheter en ligne sans se tromper.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$comprar-por-internet-de-forma-segura-guia$q$, 'es', $q$Comprar por internet de forma segura: guía 2026$q$, $q$Cómo saber si una tienda online es fiable, detectar reseñas falsas, pagar con seguridad y conocer tus derechos de desistimiento y garantía: los buenos reflejos para comprar online sin sustos.$q$, $q$*Transparencia: Tendpick percibe una comisión si compras a través de algunos enlaces de afiliado del sitio, sin coste adicional para ti. Esta guía general se ha redactado con ayuda de una IA, la ha revisado una persona y se basa únicamente en fuentes publicadas, que se enumeran al final de la página. No sustituye el asesoramiento jurídico. Fuentes comprobadas el 21 de octubre de 2026.*

Comprar online es ya un gesto cotidiano, y las estafas también. Una tienda falsa, una reseña inventada o un «precio tachado» engañoso pueden salir caros, mientras que unas pocas comprobaciones bastan casi siempre para protegerse. Esta guía recoge los buenos reflejos en el orden en que sirven: antes de pedir, al pagar y, si algo falla, después. Las normas y las cifras proceden de organismos públicos y asociaciones de consumidores españolas (INCIBE, OCU, FACUA, Banco de España, Agencia Tributaria, Comisión Europea) y llevan su fecha. Para cualquier compra concreta, la lógica es la misma que en nuestras [guías de compra por producto](/blog?category=guides-achat): comprobar antes de comprar, no después.

## Antes de comprar: comprueba quién vende

Lo primero es saber con quién tratas. Una tienda seria muestra sin esfuerzo su nombre o razón social, su dirección, un medio de contacto y su aviso legal. INCIBE, el organismo público de ciberseguridad, insiste en comprobar la legitimidad de la tienda y su información legal antes de pagar.

Algunos gestos sencillos ayudan:

- Escribe tú mismo la dirección de la tienda en lugar de pulsar un enlace recibido por correo, SMS o redes sociales.
- Comprueba el dominio exacto: OCU recomienda fijarse en que la dirección corresponda realmente a la marca.
- Busca el nombre de la tienda junto a la palabra «estafa» o «opiniones».
- Si compras en un marketplace, identifica quién vende de verdad: OCU recomienda comprobar quién es el vendedor real, y no solo la plataforma que lo aloja.

## Señales de una tienda online falsa

Una tienda fraudulenta puede copiar el diseño de una legítima: lo que debe alertarte es la suma de indicios. INCIBE, el Ministerio del Interior y OCU coinciden en varios:

- Precios muy por debajo del mercado.
- Falta de datos de contacto o de aviso legal.
- Diseño o textos descuidados, enlaces rotos, redes sociales inexistentes.
- Un dominio muy reciente.
- Iconos de pago que no funcionan, o la petición de pagar o comunicarte fuera de la plataforma.

![Ordenador portátil con un icono de candado de seguridad sobre una mesa](https://images.pexels.com/photos/4973899/pexels-photo-4973899.jpeg?auto=compress&cs=tinysrgb&w=1600)

Otro mito: el candado junto a la dirección no garantiza que la tienda sea honesta. Which?, la organización británica de consumidores, recuerda que solo indica que la conexión va cifrada, no que el vendedor sea de fiar. Desconfía también de los mensajes que te meten prisa (paquete retenido, reembolso pendiente, cuenta bloqueada): el Ministerio del Interior alertó en 2023 de las ciberestafas basadas en phishing y tiendas falsas. Ante un mensaje así, entra en la web oficial escribiendo tú la dirección.

## Cómo comparar precios y descuentos reales

El precio que ves no es el que pagas. Compara siempre el total al final de la cesta: envío, extras, impuestos y, si compras fuera de la UE, posibles gastos de aduana. Consumo Responde recuerda además que, en una rebaja, el descuento debe calcularse sobre el precio más bajo aplicado en los 30 días anteriores (nota de diciembre de 2025).

OCU lo ha medido: en un estudio de 2024 sobre 15.000 precios en 60 tiendas, el 30 % de los productos bajó de precio durante el Black Friday y el 43 % subió. Su consejo es apuntar los precios con antelación, varios días antes de las campañas, para saber si la oferta es real. Es un estudio de 2024: sirve como orden de magnitud, no como cifra de hoy.

![Smartphone junto a una calculadora y unas gafas sobre un escritorio](https://images.pexels.com/photos/8970686/pexels-photo-8970686.jpeg?auto=compress&cs=tinysrgb&w=1600)

Por eso Tendpick no muestra precios en sus fichas: cambian más rápido que los artículos.

## Reseñas: cómo detectar las falsas

Las reseñas ayudan a elegir si se leen con método. Desde el 28 de mayo de 2022, las empresas deben indicar si las reseñas proceden de compradores reales y cómo se tratan; incumplirlo es una práctica desleal que puede acarrear multas de hasta un millón de euros, según OCU. En un estudio de 2021, OCU encontró que el 8,4 % de los productos de Amazon analizados tenía una nota claramente influida por reseñas sospechosas.

Las señales que destaca OCU:

- Reseñas sin la etiqueta de «compra verificada».
- Picos de reseñas en pocas fechas.
- Una distribución de notas «en C»: muchas de cinco estrellas, muchas de una y casi nada en medio.
- Perfiles que solo publican opiniones positivas.

Busca también opiniones fuera de la web del vendedor (prensa especializada, foros, asociaciones de consumidores).

## Cómo pagar de forma segura

Antes de pagar, comprueba que la dirección empieza por https y que el importe final coincide con el que esperabas. Desde la normativa europea de pagos, la autenticación reforzada exige al menos dos elementos entre algo que sabes, algo que tienes y algo que eres: número de tarjeta, fecha y CVV ya no bastan, explica el Banco de España.

![Persona sosteniendo una tarjeta bancaria delante de un portátil para una compra online](https://images.pexels.com/photos/5717969/pexels-photo-5717969.jpeg?auto=compress&cs=tinysrgb&w=1600)

Según Consumo Responde (nota del 1 de abril de 2026), los medios de pago más recomendables son las plataformas intermediarias, las tarjetas virtuales o de prepago, el pago móvil con tokenización y las tarjetas con doble autenticación. A evitar: la transferencia a un desconocido, el pago fuera de la plataforma y las transferencias internacionales entre particulares. Un banco que ha autorizado un pago con tarjeta lo considera irrevocable, aunque puede intentar recuperarlo (chargeback) si el producto no llega o no es conforme, sin garantía de éxito.

BBVA, en un artículo propio, sugiere usar una tarjeta dedicada a internet con poco saldo, activarla solo cuando la necesites y no guardar los datos en las tiendas: es el consejo de un banco, no una norma, pero es fácil de aplicar.

## Comprar fuera de la UE: aduanas e IVA

Un precio atractivo en una tienda de fuera de la UE puede esconder costes. Según la Comisión Europea, desde el 1 de julio de 2026 se suprimió la franquicia de derechos para los envíos de 150 euros o menos y se aplica, de forma temporal hasta el 1 de julio de 2028, un derecho de 3 euros por línea arancelaria (Reglamento (UE) 2026/382). La Agencia Tributaria indica que, a partir del 1 de noviembre de 2026, se añade una tasa de tramitación de 2 euros. El IVA se incluye en el precio si la tienda usa el sistema IOSS; en caso contrario, el transportista suele reclamar un 21 % y puede cobrar gastos de gestión.

Dos detalles importantes de Consumo Responde y la Agencia Tributaria: lo que cuenta es el país desde el que se envía realmente el pedido, no el dominio de la web, y los derechos pagados no se reembolsan si simplemente desistes de la compra, salvo producto defectuoso. A igualdad de precio, una tienda europea sale casi siempre más cuenta.

## Después del pedido: guarda los justificantes

Conserva la confirmación del pedido, los correos con el vendedor, capturas de la oferta y el justificante de pago. INCIBE y Consumo Responde recomiendan guardar la factura y las pruebas de pago, y revisar los movimientos de tu cuenta para comprobar que el cargo coincide.

![Repartidor entregando paquetes a una clienta en la puerta de su casa](https://images.pexels.com/photos/6995138/pexels-photo-6995138.jpeg?auto=compress&cs=tinysrgb&w=1600)

Si no se pactó una fecha de entrega, FACUA indica que el plazo máximo es de 30 días desde la celebración del contrato.

## Tus derechos: 14 días de desistimiento y garantía de 3 años

**Derecho de desistimiento.** En las compras a distancia tienes 14 días naturales para devolver el producto, sin dar motivos y sin penalización; en un bien, el plazo cuenta desde la recepción. El vendedor debe devolverte el dinero en un máximo de 14 días desde que se lo comunicas, incluidos los gastos de envío iniciales y por el mismo medio de pago, aunque puede esperar a recibir el producto o una prueba de su devolución. Pagas solo los costes directos de devolución, salvo que el vendedor no te haya informado o los asuma (administracion.gob.es).

![Manos abriendo una caja de cartón](https://images.pexels.com/photos/27200515/pexels-photo-27200515.jpeg?auto=compress&cs=tinysrgb&w=1600)

Quedan excluidos, entre otros, los productos personalizados, los soportes o programas precintados que abras, las entradas, el alojamiento con fecha fija, la alimentación y los contenidos digitales descargados con tu consentimiento. Ojo: las tiendas pueden ofrecer más que el mínimo legal, como los 30 días de PcComponentes o los 60 de MediaMarkt según sus páginas de ayuda, pero son políticas comerciales que pueden cambiar.

**Garantía legal.** Desde el 1 de enero de 2022, la garantía legal de los bienes nuevos es de tres años (Portal de Consumo, Real Decreto-ley 7/2021); para un bien de segunda mano comprado a un profesional, la duración puede pactarse pero no será inferior a un año. Se presume que la falta de conformidad ya existía en la entrega durante dos años en el caso de un bien nuevo, y durante un año en uno de segunda mano. Si falla, tienes derecho a la reparación o la sustitución y, si no es posible, a la rebaja del precio o a la resolución del contrato. Algunas webs, incluida una guía de OCU de 2021, siguen hablando de dos años: esa cifra ha quedado anticuada.

## Si algo sale mal: reclamación, arbitraje, banco y Policía

1. Reclama primero a la tienda, por escrito y guardando copia.
2. Pide la hoja de reclamaciones: es gratuita y la empresa debe facilitarla; Consumo Responde indica que responde en 10 días hábiles.
3. Puedes acudir a la Junta Arbitral de Consumo, un procedimiento gratuito y voluntario para la empresa: si se adhiere, el laudo es vinculante.
4. Si la tienda está en otro país de la UE, el Centro Europeo del Consumidor en España te orienta (OCU). Ya no existe la plataforma europea de resolución de litigios en línea (ODR): cerró en marzo de 2025, por lo que conviene desconfiar de páginas que aún la citen.
5. Si pagaste con tarjeta, avisa cuanto antes a tu banco, que puede intentar una devolución.
6. Si crees haber sufrido una estafa, INCIBE aconseja denunciarlo a la Policía.

## Preguntas frecuentes

**¿Cómo saber si una tienda online es fiable?**
Comprueba el aviso legal, la dirección exacta del dominio, las opiniones fuera de la propia web y si los precios son coherentes. Un solo indicio no basta: es el conjunto lo que cuenta.

**¿Cuál es la forma más segura de pagar por internet?**
Una tarjeta, mejor si es virtual o de prepago, con autenticación reforzada, o una plataforma de pago intermediaria. Evita la transferencia a un desconocido.

**¿Cuántos días tengo para devolver un producto comprado online?**
Al menos 14 días naturales desde la recepción, sin dar motivos. Hay excepciones, como los productos personalizados.

**¿Cuántos años de garantía tiene un producto comprado por internet?**
Tres años para un bien nuevo desde el 1 de enero de 2022; un mínimo de un año para uno de segunda mano comprado a un profesional.

**¿Cómo detectar reseñas falsas?**
Desconfía de reseñas sin compra verificada, de picos en pocas fechas y de perfiles que solo dan cinco estrellas. Busca opiniones fuera de la web del vendedor.

**¿Qué hago si compro en una tienda falsa?**
Reúne las pruebas, avisa a tu banco, presenta la denuncia ante la Policía y reclama por escrito si hay forma de contactar con la tienda.

**¿Se puede recuperar el dinero de una estafa online?**
No hay garantía. Con tarjeta, tu banco puede intentar una devolución; con transferencia a un desconocido es mucho más difícil.

**¿Se pagan aduanas por comprar fuera de la UE?**
Sí: IVA, un derecho de 3 euros por línea arancelaria desde julio de 2026 y, desde noviembre de 2026, una tasa de tramitación de 2 euros, según las fuentes citadas.

**¿Cómo saber si un descuento es real?**
Comprueba que se calcule sobre el precio más bajo de los 30 días anteriores y compara el total con otras tiendas.

## Lo esencial

Comprueba al vendedor antes de nada, desconfía de los precios demasiado bajos y de los mensajes con prisa, paga con tarjeta (virtual si puedes), guarda los justificantes y recuerda tus dos derechos clave: 14 días para desistir y tres años de garantía en un producto nuevo. Si preparas una compra concreta, echa un vistazo a [nuestra selección](/produits) o a las [más vendidas](/top-ventes) con estos reflejos en mente.

## Fuentes

- INCIBE, «Guía para una compra segura en Internet», 19 de diciembre de 2017: https://www.incibe.es/ciudadania/formacion/guias/guia-para-compra-segura-en-internet
- INCIBE, «Compras seguras online»: https://www.incibe.es/ciudadania/tematicas/compras-seguras-online
- INCIBE, «Cómo comprar online y no caer en el intento», 19 de junio de 2019: https://www.incibe.es/ciudadania/blog/como-comprar-online-y-no-caer-en-el-intento
- OCU, «Fraude o cierre de tienda online», 25 de mayo de 2026: https://www.ocu.org/consumo-familia/compras-online/consejos/fraude-o-cierre-tienda-online
- OCU, normas sobre reseñas falsas, 27 de mayo de 2022: https://www.ocu.org/consumo-familia/compras-online/noticias/normas-fake-reviews
- OCU, estudio sobre reseñas falsas, 1 de junio de 2021: https://www.ocu.org/consumo-familia/compras-online/noticias/fake-reviews
- OCU, nota de prensa sobre el Black Friday, 3 de noviembre de 2025: https://www.ocu.org/organizacion/prensa/notas-de-prensa/2025/blackfriday031125
- FACUA, plazo de entrega: https://facua.org/tusderechos/faq/he-comprado-un-libro-por-internet-cual-es-el-plazo-maximo-de-entrega/
- Banco de España, Portal del Cliente Bancario, 20 de marzo de 2020: https://clientebancario.bde.es/pcb/es/blog/opera-desde-casa.html
- Ministerio del Interior, alerta sobre phishing y tiendas falsas, 26 de abril de 2023: https://www.interior.gob.es/opencms/es/detalle/articulo/Interior-alerta-sobre-las-ciberestafas-del-phishing-y-de-las-falsas-tiendas-de-venta-online/
- Portal de Consumo, garantías: https://portal-cec.consumo.gob.es/es/informacion-general/temas-de-consumo/garantias
- administracion.gob.es, devoluciones, actualizado el 18 de marzo de 2026: https://administracion.gob.es/pag_Home/Tu-espacio-europeo/derechos-obligaciones/ciudadanos/consumidores/compraventa/devolucion.html
- Agencia Tributaria, envíos de hasta 150 euros, actualizado el 20 de octubre de 2026: https://sede.agenciatributaria.gob.es/Sede/aduanas/comercio-electronico-pipe-envios-particulares/compras-internet-envios-particulares/envios-valor-hasta-150-euros.html
- Comisión Europea, Access2Markets, derecho de 3 euros, 30 de junio de 2026: https://trade.ec.europa.eu/access-to-markets/es/news/la-ue-aplica-un-derecho-de-aduana-de-3-eur-por-articulo-los-envios-de-comercio-electronico-de-bajo
- INAP, supresión de la plataforma ODR, 2 de enero de 2025: https://laadministracionaldia.inap.es/noticia.asp?id=1251024
- Consumo Responde (Junta de Andalucía), métodos de pago, 1 de abril de 2026: https://www.consumoresponde.es/actualidad/noticias/metodos-pago-mas-seguros-compras-online-cuales-evitar
- Consumo Responde, hoja de reclamaciones y arbitraje, 24 de abril de 2024: https://www.consumoresponde.es/actualidad/noticias/hoja-quejas-reclamaciones-arbitraje-principales-recursos-solucionar-conflictos-consumo
- Consumo Responde, precios de referencia, 29 de diciembre de 2025: https://www.consumoresponde.es/actualidad/noticias/consumo-incide-norma-europea-precios-reconocer-falsas-rebajas
- Consumo Responde, compras desde fuera de la UE, 5 de octubre de 2026: https://www.consumoresponde.es/art%C3%ADculos/compras_distancia_desde_fuera_de_la_union_europea_de_menos_de_150_eu
- BBVA, «Siete consejos prácticos para comprar online de forma segura»: https://www.bbva.com/es/innovacion/siete-consejos-practicos-para-comprar-online-de-forma-segura/
- Which?, «How to spot a fake, fraudulent or scam website», 7 de agosto de 2026: https://www.which.co.uk/consumer-rights/advice/how-to-spot-a-fake-fraudulent-or-scam-website-aUBir8j8C3kZ
- PcComponentes y MediaMarkt, páginas de ayuda sobre devoluciones: https://help.pccomponentes.com/hc/es-es/articles/21624280186397-Devolver-un-producto y https://specials.mediamarkt.es/pedido/devolucion

Fotos: Kindel Media, Dan Nelson, Kaboompics, Leeloo The First y Berna, en Pexels (licencia Pexels: uso libre).
$q$, $q$https://images.pexels.com/photos/7007174/pexels-photo-7007174.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$comprar online$q$, $q$compra segura$q$, $q$estafas online$q$, $q$tienda falsa$q$, $q$desistimiento$q$, $q$garantía legal$q$, $q$reseñas falsas$q$, $q$pago seguro$q$, $q$guía de compra$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$guides-achat$q$), '{}', NULL, $q$Comprar por internet de forma segura: guía 2026$q$, $q$Cómo saber si una tienda es fiable, detectar reseñas falsas, pagar con seguridad y conocer tus derechos: la guía para comprar online sin sustos.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (slug, market, title, excerpt, content, cover_image_url, status, tags, category_id, linked_product_ids, author_name, meta_title, meta_description, generated_by_ai, published_at)
VALUES ($q$how-to-shop-online-safely-guide$q$, 'uk', $q$How to Shop Online Safely: A 2026 Guide with UK Rights$q$, $q$Spot fake websites and fake reviews, pay safely, and know your rights: 14-day cancellation, 30-day right to reject, Section 75 and chargeback. A practical guide to buying online.$q$, $q$*Transparency: Tendpick earns a commission if you buy through some links on the site, at no extra cost to you. This general guide was written with the help of an AI, reviewed by a person, and relies only on published sources, listed at the end of the page. It is not legal advice. Sources checked on 21 October 2026.*

Shopping online is routine now, and so are the scams. A fake website, a made-up review or a misleading "was £X" price can be costly, yet a handful of checks usually keeps you safe. This guide follows the order in which they help: before you order, when you pay, and if something goes wrong. The rules and figures come from public bodies and consumer organisations (the CMA, Citizens Advice, MoneySavingExpert, Which?, the NCSC) and carry their dates. For a specific purchase, the logic is the same as in our [product buying guides](/blog?category=guides-achat): check first, buy second.

## Before you buy: check who is really selling

Start by knowing who you are dealing with. A reputable shop shows its company name, a contact address and clear returns and delivery policies. Which? recommends checking the company, for example on Companies House, and looking at how long the website has existed.

A few simple habits help:

- Type the shop's address yourself instead of clicking a link in an email, text or social post. The Which? checklist also warns about web addresses with swapped letters or extra words such as "deals".
- Look up the website's name with the word "scam" or "reviews".
- Check the domain registration date with a lookup tool: Which? mentions who.is, and a very recent domain is a warning sign.
- On a marketplace, check who is actually selling and shipping: your rights, and who you complain to, depend on it.

## How to spot a fake website

Fake sites can copy a real one perfectly. What should worry you is the accumulation of small clues. Which? lists these:

- A recently registered or look-alike domain.
- Prices that look too good to be true, or countdown timers pushing you to hurry.
- Missing contact details or missing returns and privacy policies.
- Reviews that are suspiciously similar to each other.
- A request to pay by bank transfer.

![Laptop showing a security padlock icon on a table](https://images.pexels.com/photos/4973899/pexels-photo-4973899.jpeg?auto=compress&cs=tinysrgb&w=1600)

One common myth: the padlock beside the web address does not prove the site is honest. Which?, Get Safe Online and the US Federal Trade Commission all say that the padlock and https do not prove a site is legitimate. The CMA also advises against clicking unexpected messages and suggests previewing the link behind a QR code before you open it.

## Compare prices and check if a deal is real

The listed price is not the final price. Compare the total at the end of the basket, including delivery and any import charges for sellers abroad. Since 6 April 2025, the DMCC Act requires unavoidable fees to be included in the price shown from the start, so unavoidable fees should be part of the headline price, according to Which?.

For discounts, look at the history, not the "was" price. Which? checked 175 Black Friday 2024 deals and found that every one had been available at the same price or cheaper in the six months around the sale. It also looked at 1,617 TVs advertised with a "was/now" price: 56 per cent had already sold at an intermediate price. Which? mentions price-tracking tools such as PriceSpy and Pricerunner (and CamelCamelCamel for Amazon). We have not tested them, so use them as a guide, not a guarantee.

![Smartphone next to a calculator and glasses on a desk](https://images.pexels.com/photos/8970686/pexels-photo-8970686.jpeg?auto=compress&cs=tinysrgb&w=1600)

That is also why Tendpick does not show prices on its pages: they change faster than the articles do.

## Reviews: how to read them (and spot fake ones)

Reviews help you choose if you read them carefully. Since 6 April 2025, fake reviews are banned in the UK: businesses cannot commission or publish them, nor host reviews without taking reasonable steps to check them, says Which?. The CMA can fine breaches up to 10 per cent of global turnover, and it opened investigations into five businesses over fake and misleading reviews in March 2026. Those cases had no outcome at the date of the source, so treat them as ongoing.

To read reviews safely:

- Look for clusters of reviews posted on the same day, or reviews with nearly identical wording.
- Read the middling reviews first: they are usually the most detailed.
- Check independent sources (review sites such as Trustpilot or Feefo, specialist press, forums) rather than only the seller's own page.
- Be wary of a perfect score from very few reviews.

## How to pay safely: Section 75 and chargeback

How you pay matters more than most people think.

**Credit card and Section 75.** For items costing more than £100 and up to £30,000, Section 75 of the Consumer Credit Act makes your credit card provider jointly responsible if the seller does not deliver or the goods are not as described, according to MoneySavingExpert (updated 13 October 2026). It can apply even if you paid only part of the price by credit card. It can also extend to store cards, PayPal Credit and Apple Pay or Google Pay backed by a credit card. It does not apply to debit cards, and the seller must be the party you paid. If your provider has not given a final answer within eight weeks, you can go to the Financial Ombudsman.

**Chargeback.** This is a card-network scheme, not a legal right. It covers debit, prepaid and credit cards, and the time limit is generally 120 days, sometimes up to 540, says MoneySavingExpert (updated 21 July 2026). It is especially useful with a debit card, because Section 75 does not cover those. The merchant can contest the claim, and PayPal payments are generally not covered.

![Person holding a bank card in front of a laptop for an online purchase](https://images.pexels.com/photos/5717969/pexels-photo-5717969.jpeg?auto=compress&cs=tinysrgb&w=1600)

A few more habits:

- Never pay by bank transfer to a seller you do not know: the NCSC, Get Safe Online and Which? all say so.
- Virtual cards and digital wallets limit how much of your card details a shop sees (Which?).
- Use guest checkout when you can, fill in only the required fields, and protect your accounts with unique passwords and two-step verification (NCSC).

## Buying from abroad: VAT, duties and delivery

Which? explains the rules for orders from EU sellers (page updated 7 October 2026). On orders worth £135 or less, there are no extra import charges and VAT is already in the price. Above £135, customs duty of 0 to 25 per cent can apply depending on the product, plus 20 per cent import VAT on the price and postage, and the carrier's handling fee. For gifts, VAT and handling fees may apply above £39. We could not confirm the rules for sellers in the US or elsewhere in a source we opened, so check the shop's own information before you pay.

## After you order: keep your evidence

Keep the order confirmation, emails with the seller, screenshots of the listing and the payment receipt. Citizens Advice and MoneySavingExpert both stress that these records help if you need to cancel, return something or make a Section 75 claim. The CMA reminds shoppers that the seller, not the courier, is responsible for delivery, and that goods should arrive within 30 days unless you agreed otherwise.

![Delivery driver handing parcels to a customer at the door](https://images.pexels.com/photos/6995138/pexels-photo-6995138.jpeg?auto=compress&cs=tinysrgb&w=1600)

## Your rights: 30 days, 14 days and faulty goods

**30-day right to reject.** Under the Consumer Rights Act 2015, section 22, if goods are faulty you have a short-term right to reject them within 30 days. The clock starts the day after the last of these: you own or possess the goods, they are delivered and, if the contract includes installation, installation is reported complete. A request for a repair or replacement pauses the clock. The CMA's summary: a full refund within 30 days; after that, the seller can offer a repair or replacement.

**14-day cancellation for distance sales.** You can change your mind within 14 days of receiving the goods, with no reason needed, according to Citizens Advice. The seller must refund within 14 days of receiving the goods back or proof that you sent them, whichever is earlier. You may have to pay the return cost unless the seller did not say who pays, and you get standard delivery refunded but not the extra cost of express delivery. Made-to-measure and perishable goods are excluded, and so are purchases from a private seller. If the seller did not give you the required information, the period can run up to 12 months and 14 days.

![Hands opening a cardboard box](https://images.pexels.com/photos/27200515/pexels-photo-27200515.jpeg?auto=compress&cs=tinysrgb&w=1600)

**Retailer policies.** Many shops give you more than the legal minimum. According to their help pages, Argos, John Lewis and Currys offer 30 days to change your mind, and Argos has extended that to 31 January 2027 for purchases from 23 September to 25 December 2026. Treat these as commercial policies that can change, not as legal rights.

## If something goes wrong

1. Contact the seller first, in writing, and keep a copy.
2. If you paid by credit card for an item over £100, make a Section 75 claim; otherwise, ask your bank about a chargeback.
3. Trading Standards investigates unfair practices but does not settle your individual dispute. Citizens Advice's consumer service gives advice and handles reports (its guidance page was last reviewed in 2019, so check it for changes).
4. Alternative dispute resolution (ADR): the DMCC (Alternative Dispute) Regulations 2026 are meant to make accreditation of ADR providers mandatory. The source gives no start date, so look for an accredited provider through the Chartered Trading Standards Institute list.
5. If it is a scam, tell your bank first, then report the fraud (the NCSC and CMA use the name "Report Fraud"; some older pages still say Action Fraud).

## Shopping from the US: a few pointers

If you are reading from the United States, the FTC's rules work differently. The FTC's merchandise rule says that, if no shipping time is stated, a seller must reasonably be able to ship within 30 days of a complete order. If the delivery is delayed, the seller must offer to accept the new date or cancel with a refund, usually within seven business days. To dispute a credit card charge, write to the card issuer within 60 days of the first bill that shows the error. And never pay with gift cards, wire transfers, payment apps or cryptocurrency for an online purchase: the FTC lists these as payment methods scammers ask for.

## FAQ

**Is it safe to shop online?**
Yes, if you check the seller, pay with a protected method and keep your evidence. Most problems come from fake websites and unusually low prices.

**How can I tell if an online shop is legit?**
Check the company details, the domain's age, independent reviews and the clarity of its returns policy. No single sign is enough on its own.

**What is the safest way to pay online?**
A credit card (Section 75 for items over £100 and chargeback), or a debit card with chargeback. Avoid bank transfers to sellers you do not know.

**What is Section 75 and does it cover debit cards?**
It makes a credit card provider jointly liable for purchases between £100 and £30,000. It does not apply to debit cards; chargeback may help with those.

**Can I return something I bought online?**
Yes: 14 days to cancel a distance sale, and 30 days to reject faulty goods, with exclusions such as made-to-measure items.

**Is PayPal safe for online shopping?**
It is widely used, but MoneySavingExpert says PayPal payments are generally not covered by chargeback. Section 75 may extend to PayPal Credit.

**How do I get a refund if the item never arrived?**
The seller is responsible for delivery. Contact them in writing, then use Section 75 or chargeback.

**Will I pay import VAT or customs on orders from abroad?**
Up to £135 from EU sellers there are no extra import charges per Which?; above that, duty, import VAT and handling fees can apply.

**How can I spot fake reviews?**
Look for clusters of similar reviews posted together and check independent sources.

**What should I do if I think I've been scammed?**
Tell your bank immediately, keep the evidence and report it as fraud.

## The short version

Check the seller, distrust prices that are too low and messages that rush you, pay by credit card where you can, keep your records, and remember the key rights: 14 days to cancel, 30 days to reject faulty goods, and Section 75 for credit card purchases over £100. If you are preparing a specific purchase, browse [our selection](/produits) or [best sellers](/top-ventes) with these habits in mind.

## Sources

- Which?, "How to spot a fake, fraudulent or scam website", 7 August 2026: https://www.which.co.uk/consumer-rights/advice/how-to-spot-a-fake-fraudulent-or-scam-website-aUBir8j8C3kZ
- Which?, "How to spot an online shopping scam", 3 August 2026: https://www.which.co.uk/reviews/online-shopping/article/online-shopping/how-to-spot-an-online-shopping-scam-ap5et5v8oct2
- Which?, "How to tell if a website is safe", 11 June 2026: https://www.which.co.uk/news/article/how-to-tell-if-a-website-is-safe-azIsb1x7DuGc
- Which?, "Are Black Friday deals real?", 6 November 2025: https://www.which.co.uk/reviews/black-friday/article/black-friday-deals-how-to-check-if-a-black-friday-deal-is-real-aKtJD2L0zJEt
- Which?, "Fake reviews and sneaky fees banned under new law", 7 April 2025: https://www.which.co.uk/news/article/fake-reviews-and-sneaky-fees-banned-under-new-law-campaigned-for-by-which-aLzVp4g0S76D
- Which?, "Online shopping: VAT, import and handling costs", 7 October 2026: https://www.which.co.uk/consumer-rights/advice/online-shopping-do-i-have-to-pay-vat-import-and-handling-costs-ajPOC6A5brEA
- CMA, "Shop smart, bag a bargain", 13 November 2025: https://competitionandmarkets.blog.gov.uk/2025/11/13/shop-smart-bag-a-bargain/
- CMA / GOV.UK, "Fake and misleading reviews: 5 businesses under CMA investigation", 27 March 2026: https://www.gov.uk/government/news/fake-and-misleading-reviews-5-businesses-under-cma-investigation
- Citizens Advice, "Changing your mind about something you've bought": https://www.citizensadvice.org.uk/consumer/changed-your-mind/changing-your-mind-about-something-youve-bought/
- Citizens Advice, "Reporting to Trading Standards" (reviewed 2019): https://www.citizensadvice.org.uk/consumer/get-more-help/report-to-trading-standards/
- MoneySavingExpert, "Section 75 refunds", updated 13 October 2026: https://www.moneysavingexpert.com/reclaim/section75-protect-your-purchases/
- MoneySavingExpert, "Debit & credit card chargeback", updated 21 July 2026: https://www.moneysavingexpert.com/reclaim/visa-mastercard-chargeback/
- Legislation.gov.uk, Consumer Rights Act 2015, section 22: https://www.legislation.gov.uk/ukpga/2015/15/section/22?view=plain
- NCSC, "Shopping and paying safely online": https://www.ncsc.gov.uk/guidance/shopping-online-securely
- Get Safe Online, "Buying safely online", 1 November 2024: https://www.getsafeonline.org/onlineshopping/
- DMCC Act 2024 (Alternative Dispute) Regulations 2026, GOV.UK: https://www.gov.uk/government/publications/the-digital-markets-competition-and-consumers-act-2024-alternative-dispute-regulations-2026
- FTC, "Online Shopping", 20 November 2025: https://consumer.ftc.gov/articles/online-shopping
- FTC, Mail, Internet, or Telephone Order Merchandise Rule (business guide), 22 July 2025: https://www.ftc.gov/business-guidance/resources/business-guide-ftcs-mail-internet-or-telephone-order-merchandise-rule
- Retailer help pages: Argos (https://help.argos.co.uk/help/refunds-&-returns/returns-product-support-and-repairs/returnsproductsupportrepairs), John Lewis (https://johnlewis.com/customer-services/returns/how-to-return-your-item), Currys (https://www.currys.co.uk/services/shopping-with-us/returns-refunds.html)

Photos: Kindel Media, Dan Nelson, Kaboompics, Leeloo The First and Berna, on Pexels (Pexels licence: free to use).
$q$, $q$https://images.pexels.com/photos/7007174/pexels-photo-7007174.jpeg?auto=compress&cs=tinysrgb&w=1600$q$, 'draft', ARRAY[$q$online shopping$q$, $q$safe online shopping$q$, $q$scams$q$, $q$fake website$q$, $q$consumer rights$q$, $q$Section 75$q$, $q$chargeback$q$, $q$fake reviews$q$, $q$buying guide$q$]::text[], (SELECT id FROM blog_categories WHERE slug = $q$guides-achat$q$), '{}', NULL, $q$How to Shop Online Safely: A 2026 Guide with UK Rights$q$, $q$Spot fake websites and reviews, pay safely and know your 14-day and 30-day rights, Section 75 and chargeback. Your guide to buying online.$q$, true, NULL)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Contrôle : doit renvoyer 3 lignes en statut draft.
-- SELECT slug, market, status FROM blog_posts WHERE slug IN ('acheter-sur-internet-en-securite-guide','comprar-por-internet-de-forma-segura-guia','how-to-shop-online-safely-guide');
