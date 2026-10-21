/**
 * Copie centralisée fr/es/uk pour le CHROME du site catalogue Tendpick
 * (header, footer, bannière hero, pages catalogue/catégorie/top-ventes,
 * page bio, métadonnées globales).
 *
 * Point d'entrée unique — les composants piochent ici plutôt que de
 * dupliquer des chaînes en dur. Complète lib/consent-copy.ts (cookies /
 * disclosure, déjà localisé séparément) sans le dupliquer.
 *
 * Hors périmètre volontairement (03/10, demande Jerome "traduis tous les
 * textes des 3 sites" scopée au catalogue après clarification) : les
 * one-pages produit générées par IA (app/[slug]/page.tsx et ses sections
 * HeroSection/ProductShowcase/Benefits/PainPoints/Testimonials/FAQ) sont un
 * système séparé avec son propre i18n partiel (CTA_I18N dans
 * app/[slug]/page.tsx) — à traiter à part si besoin.
 */

import type { Market } from '@/lib/market';

function plural(n: number, fr = 's'): string {
  return n > 1 ? fr : '';
}

interface SiteCopy {
  nav: {
    homeAria: string;
    topVentes: string;
    buyingGuide: string;
    blog: string;
    seeAll: string;
    searchPlaceholder: string;
    searchAria: string;
    cartAria: (count: number) => string;
    cartTitle: string;
    menuAria: string;
    categoriesLabel: string;
    cartLabel: string;
    itemCount: (count: number) => string;
  };
  footer: {
    tagline: string;
    categoriesLabel: string;
    allCatalog: string;
    help: string;
    about: string;
    method: string;
    partners: string;
    legalMentions: string;
    privacy: string;
    contact: string;
    newsletter: string;
    newsletterSub: string;
    emailPlaceholder: string;
    newsletterButtonTitle: string;
    ok: string;
    copyrightPrefix: string;
    transparencyLink: string;
  };
  hero: {
    slides: { headlineLine1: string; headlineLine2: string; subtitle: string }[];
    slideAria: (i: number) => string;
  };
  common: {
    priceAtMerchant: string;
    seeArrow: string;
    topPrefix: string;
  };
  home: {
    emptyPlatform: string;
    seeFullTopVentes: string;
    momentSelection: string;
    seeAllProducts: string;
    blogTeaserTitle: string;
    exploreCategoryDesc: string;
    ourAdvice: string;
    fromBlog: string;
    blogImageAlt: string;
    readArticle: string;
    seeAllBlog: string;
    howItWorks: string;
    steps: { emoji: string; title: string; desc: string }[];
  };
  category: {
    metaDescription: (name: string) => string;
    productCount: (n: number) => string;
    newSoon: string;
    preparing: string;
    comeBackDays: string;
  };
  products: {
    metaTitle: string;
    metaDescription: string;
    resultsFor: (q: string) => string;
    ourSelection: string;
    productCountUpdated: (n: number) => string;
    noResultsQuery: string;
    newSoon: string;
    backToCatalog: string;
    nothingFor: (q: string) => string;
    firstSelectionPreparing: string;
    comeBackHours: string;
  };
  topVentesPage: {
    metaTitle: string;
    metaDescription: string;
    productCountAmong: (n: number) => string;
    preparing: string;
    all: string;
    nonePlatform: string;
  };
  blogPage: {
    metaTitle: string;
    metaDescription: string;
    all: string;
    noArticles: string;
  };
  // Guide d'achat (21/10) : section à part entière, entrée du menu.
  guidePage: {
    metaTitle: string;
    metaDescription: string;
    moreGuides: string;
    readGuide: string;
  };
  // Page produit (06/10, maquette A validée par Jerome). Remplace les
  // chaînes en dur de l'ancienne one-page (CTA_I18N dans app/[slug]).
  // Le CONTENU du produit (titre, description, points forts, FAQ) vient de
  // la DB dans la langue du marché du produit — seul le chrome est ici.
  product: {
    locale: string;
    breadcrumbAria: string;
    breadcrumbHome: string;
    availableOn: (source: string) => string;
    seeOffer: (source: string | null) => string;
    seeOfferShort: string;
    redirectNote: string;
    securePayment: string;
    deliveryMerchant: string;
    tabDescription: string;
    tabPoints: string;
    tabFaq: string;
    whyChosen: string;
    inBrief: string;
    briefMarket: string;
    briefSoldBy: string;
    briefCategory: string;
    pointsTitle: string;
    faqTitle: string;
    relatedTitle: string;
    photoAria: (n: number, total: number) => string;
    prevPhoto: string;
    nextPhoto: string;
    zoomHint: string;
    noPhoto: string;
    galleryAria: string;
  };
  bio: {
    title: string;
    productCount: (n: number) => string;
    noProduct: string;
    affiliateFooter: string;
  };
  global: {
    siteTitleDefault: string;
    siteDescription: string;
  };
}

export const SITE_COPY: Record<Market, SiteCopy> = {
  fr: {
    nav: {
      homeAria: 'Tendpick, accueil',
      topVentes: 'Top Ventes',
      buyingGuide: "Guide d'achat",
      blog: 'Blog',
      seeAll: 'Tout voir',
      searchPlaceholder: 'Rechercher un produit…',
      searchAria: 'Rechercher',
      cartAria: (n) => `Panier, ${n} article${plural(n)}`,
      cartTitle: 'Panier — bientôt disponible',
      menuAria: 'Menu',
      categoriesLabel: 'Catégories',
      cartLabel: 'Panier',
      itemCount: (n) => `${n} article${plural(n)}`,
    },
    footer: {
      tagline: 'Le comparateur des produits tendance, tous marchés.',
      categoriesLabel: 'Catégories',
      allCatalog: 'Tout le catalogue',
      help: 'Aide',
      about: 'À propos',
      method: 'Notre méthode',
      partners: 'Partenariats',
      legalMentions: 'Mentions légales',
      privacy: 'Confidentialité',
      contact: 'Contact',
      newsletter: 'Newsletter',
      newsletterSub: 'Les meilleures trouvailles, une fois par semaine',
      emailPlaceholder: 'votre@email.com',
      newsletterButtonTitle: 'Newsletter — bientôt disponible',
      ok: 'OK',
      copyrightPrefix: 'Sélection affiliée,',
      transparencyLink: 'voir notre politique de transparence',
    },
    hero: {
      slides: [
        {
          headlineLine1: 'De nouveaux produits repérés',
          headlineLine2: 'chaque semaine',
          subtitle:
            "Notre veille identifie en continu ce qui émerge sur Amazon, Rakuten et AliExpress. Chaque fiche résume l'essentiel pour décider vite.",
        },
        {
          headlineLine1: 'Une sélection pensée,',
          headlineLine2: 'pas improvisée',
          subtitle:
            "Chaque produit référencé passe par une grille de critères avant d'apparaître ici. On privilégie la pertinence à la quantité.",
        },
        {
          headlineLine1: 'Les produits qui font parler',
          headlineLine2: 'sur les réseaux',
          subtitle:
            'On suit les tendances qui émergent sur les réseaux sociaux et on vous présente les produits concernés, avec une fiche complète pour juger par vous-même.',
        },
        {
          headlineLine1: 'Une sélection vérifiée,',
          headlineLine2: 'en toute confiance',
          subtitle: 'Chaque produit référencé est vérifié avant publication. Pas de fausses promesses, juste une information fiable.',
        },
      ],
      slideAria: (i) => `Aller à la bannière ${i}`,
    },
    common: {
      priceAtMerchant: 'Prix chez le marchand',
      seeArrow: 'Voir →',
      topPrefix: 'Top',
    },
    home: {
      emptyPlatform: 'Sélection en cours de préparation pour cette plateforme.',
      seeFullTopVentes: 'Voir tout le Top Ventes →',
      momentSelection: 'Sélection du moment',
      seeAllProducts: 'Voir tous les produits →',
      blogTeaserTitle: 'Visiter notre blog',
      exploreCategoryDesc: 'Nos articles dans cette catégorie',
      ourAdvice: 'Nos conseils',
      fromBlog: 'Depuis le blog',
      blogImageAlt: 'Image article',
      readArticle: "Lire l'article →",
      seeAllBlog: 'Voir tous les articles →',
      howItWorks: 'Comment ça marche',
      steps: [
        { emoji: '🔍', title: 'On analyse', desc: 'Chaque semaine, nous passons en revue les meilleures ventes en ligne pour trouver les produits les plus populaires et les mieux notés.' },
        { emoji: '✍️', title: 'On rédige', desc: "Pour chaque produit, nous créons une fiche complète : avantages clés, FAQ, avis clients et conseils d'achat pour vous aider à décider." },
        { emoji: '🛒', title: 'Vous achetez', desc: 'Un clic sur le bouton vous emmène directement chez le marchand, en toute sécurité, sur la page du marchand.' },
      ],
    },
    category: {
      metaDescription: (name) =>
        `${name} : notre sélection du moment, avec ce qui justifie chaque produit. Mise à jour en continu.`,
      productCount: (n) => `${n} produit${plural(n)} sélectionné${plural(n)}`,
      newSoon: 'Nouveaux produits bientôt disponibles dans cette catégorie',
      preparing: 'Sélection en cours de préparation…',
      comeBackDays: 'Revenez dans quelques jours !',
    },
    products: {
      metaTitle: 'Catalogue produits',
      metaDescription: 'Découvrez tous les produits sélectionnés par Tendpick : les meilleures ventes en ligne avec des fiches détaillées.',
      resultsFor: (q) => `Résultats pour « ${q} »`,
      ourSelection: 'Notre sélection',
      productCountUpdated: (n) => `${n} produit${plural(n)} sélectionné${plural(n)} — mis à jour chaque semaine`,
      noResultsQuery: 'Aucun produit ne correspond à cette recherche',
      newSoon: 'Nouveaux produits bientôt disponibles',
      backToCatalog: '← Voir tout le catalogue',
      nothingFor: (q) => `Rien ne correspond à « ${q} ».`,
      firstSelectionPreparing: 'Première sélection en cours de préparation…',
      comeBackHours: 'Revenez dans quelques heures !',
    },
    topVentesPage: {
      metaTitle: 'Top Ventes',
      metaDescription: 'Les produits les plus populaires, classés par plateforme : Amazon, Rakuten, AliExpress.',
      productCountAmong: (n) => `${n} produit${plural(n)} parmi les plus populaires`,
      preparing: 'Sélection en cours de préparation',
      all: 'Tout',
      nonePlatform: 'Aucun produit pour le moment sur cette plateforme.',
    },
    blogPage: {
      metaTitle: 'Blog : guides d\'achat et produits du moment',
      metaDescription:
        "Guides d'achat, comparatifs et tendances : nos articles expliquent quoi acheter, pour qui, et quand s'abstenir. Sources citées, aucun produit testé.",
      all: 'Tout',
      noArticles: 'Aucun article pour le moment — revenez bientôt !',
    },
    guidePage: {
      metaTitle: "Guide d'achat : acheter en ligne en toute sécurité",
      metaDescription:
        "Vérifier un site, repérer les faux avis, payer en sécurité, droits de rétractation et de garantie : notre guide d'achat pour acheter en ligne sans se tromper.",
      moreGuides: "Autres guides d'achat",
      readGuide: 'Lire le guide',
    },
    product: {
      locale: 'fr-FR',
      breadcrumbAria: "Fil d'Ariane",
      breadcrumbHome: 'Accueil',
      availableOn: (s) => `Disponible sur ${s}`,
      seeOffer: (s) => (s ? `Voir l'offre sur ${s}` : "Voir l'offre"),
      seeOfferShort: "Voir l'offre",
      redirectNote:
        "Vous serez redirigé vers le site du marchand. Tendpick peut percevoir une commission, sans surcoût pour vous.",
      securePayment: 'Paiement sécurisé par le marchand',
      deliveryMerchant: 'Livraison par le marchand',
      tabDescription: 'Description',
      tabPoints: 'Points forts',
      tabFaq: 'Questions fréquentes',
      whyChosen: "Pourquoi on l'a retenu",
      inBrief: 'En bref',
      briefMarket: 'Marché',
      briefSoldBy: 'Vendu par',
      briefCategory: 'Catégorie',
      pointsTitle: 'Points forts',
      faqTitle: 'Questions fréquentes',
      relatedTitle: 'Vous aimerez aussi',
      photoAria: (n, total) => `Afficher la photo ${n} sur ${total}`,
      prevPhoto: 'Photo précédente',
      nextPhoto: 'Photo suivante',
      zoomHint: 'Survolez pour zoomer',
      noPhoto: 'Photo à venir',
      galleryAria: 'Photos du produit',
    },
    bio: {
      title: 'Nos sélections',
      productCount: (n) => `${n} produit${n !== 1 ? 's' : ''} soigneusement sélectionnés`,
      noProduct: 'Aucun produit disponible pour le moment.',
      affiliateFooter: "Liens d'affiliation ·",
    },
    global: {
      siteTitleDefault: 'Tendpick — Les meilleurs produits du moment',
      siteDescription: 'Tendpick sélectionne les meilleurs produits Amazon pour vous. Fiches détaillées, sources citées, sélection mise à jour.',
    },
  },

  es: {
    nav: {
      homeAria: 'Tendpick, inicio',
      topVentes: 'Más vendidos',
      buyingGuide: "Guía de compra",
      blog: 'Blog',
      seeAll: 'Ver todo',
      searchPlaceholder: 'Buscar un producto…',
      searchAria: 'Buscar',
      cartAria: (n) => `Carrito, ${n} artículo${plural(n)}`,
      cartTitle: 'Carrito — próximamente disponible',
      menuAria: 'Menú',
      categoriesLabel: 'Categorías',
      cartLabel: 'Carrito',
      itemCount: (n) => `${n} artículo${plural(n)}`,
    },
    footer: {
      tagline: 'El comparador de los productos de moda, todos los mercados.',
      categoriesLabel: 'Categorías',
      allCatalog: 'Todo el catálogo',
      help: 'Ayuda',
      about: 'Sobre nosotros',
      method: 'Nuestro método',
      partners: 'Colaboraciones',
      legalMentions: 'Aviso legal',
      privacy: 'Privacidad',
      contact: 'Contacto',
      newsletter: 'Newsletter',
      newsletterSub: 'Los mejores hallazgos, una vez por semana',
      emailPlaceholder: 'tu@email.com',
      newsletterButtonTitle: 'Newsletter — próximamente disponible',
      ok: 'OK',
      copyrightPrefix: 'Selección de afiliados,',
      transparencyLink: 'ver nuestra política de transparencia',
    },
    hero: {
      slides: [
        {
          headlineLine1: 'Nuevos productos detectados',
          headlineLine2: 'cada semana',
          subtitle:
            'Nuestra vigilancia identifica continuamente lo que surge en Amazon, Rakuten y AliExpress. Cada ficha resume lo esencial para decidir rápido.',
        },
        {
          headlineLine1: 'Una selección pensada,',
          headlineLine2: 'no improvisada',
          subtitle:
            'Cada producto referenciado pasa por una serie de criterios antes de aparecer aquí. Priorizamos la relevancia sobre la cantidad.',
        },
        {
          headlineLine1: 'Los productos de los que se habla',
          headlineLine2: 'en redes sociales',
          subtitle:
            'Seguimos las tendencias que surgen en redes sociales y te presentamos los productos relacionados, con una ficha completa para que juzgues por ti mismo.',
        },
        {
          headlineLine1: 'Una selección verificada,',
          headlineLine2: 'con toda confianza',
          subtitle: 'Cada producto referenciado se verifica antes de su publicación. Sin falsas promesas, solo información fiable.',
        },
      ],
      slideAria: (i) => `Ir al banner ${i}`,
    },
    common: {
      priceAtMerchant: 'Precio en la tienda',
      seeArrow: 'Ver →',
      topPrefix: 'Top',
    },
    home: {
      emptyPlatform: 'Selección en preparación para esta plataforma.',
      seeFullTopVentes: 'Ver todo lo más vendido →',
      momentSelection: 'Selección del momento',
      seeAllProducts: 'Ver todos los productos →',
      blogTeaserTitle: 'Visita nuestro blog',
      exploreCategoryDesc: 'Nuestros artículos en esta categoría',
      ourAdvice: 'Nuestros consejos',
      fromBlog: 'Desde el blog',
      blogImageAlt: 'Imagen del artículo',
      readArticle: 'Leer el artículo →',
      seeAllBlog: 'Ver todos los artículos →',
      howItWorks: 'Cómo funciona',
      steps: [
        { emoji: '🔍', title: 'Analizamos', desc: 'Cada semana revisamos los más vendidos online para encontrar los productos más populares y mejor valorados.' },
        { emoji: '✍️', title: 'Redactamos', desc: 'Para cada producto creamos una ficha completa: ventajas clave, preguntas frecuentes, opiniones de clientes y consejos de compra para ayudarte a decidir.' },
        { emoji: '🛒', title: 'Tú compras', desc: 'Un clic en el botón te lleva directamente a la tienda, de forma segura, a la página de la tienda.' },
      ],
    },
    category: {
      metaDescription: (name) =>
        `${name}: nuestra selección del momento, con lo que justifica cada producto. Actualizada de forma continua.`,
      productCount: (n) => `${n} producto${plural(n)} seleccionado${plural(n)}`,
      newSoon: 'Nuevos productos disponibles próximamente en esta categoría',
      preparing: 'Selección en preparación…',
      comeBackDays: '¡Vuelve en unos días!',
    },
    products: {
      metaTitle: 'Catálogo de productos',
      metaDescription: 'Descubre todos los productos seleccionados por Tendpick: los más vendidos online con fichas detalladas.',
      resultsFor: (q) => `Resultados para «${q}»`,
      ourSelection: 'Nuestra selección',
      productCountUpdated: (n) => `${n} producto${plural(n)} seleccionado${plural(n)} — actualizado cada semana`,
      noResultsQuery: 'Ningún producto coincide con esta búsqueda',
      newSoon: 'Nuevos productos disponibles próximamente',
      backToCatalog: '← Ver todo el catálogo',
      nothingFor: (q) => `Nada coincide con «${q}».`,
      firstSelectionPreparing: 'Primera selección en preparación…',
      comeBackHours: '¡Vuelve en unas horas!',
    },
    topVentesPage: {
      metaTitle: 'Más vendidos',
      metaDescription: 'Los productos más populares, clasificados por plataforma: Amazon, Rakuten, AliExpress.',
      productCountAmong: (n) => `${n} producto${plural(n)} entre los más populares`,
      preparing: 'Selección en preparación',
      all: 'Todo',
      nonePlatform: 'Ningún producto por ahora en esta plataforma.',
    },
    blogPage: {
      metaTitle: 'Blog: guías de compra y productos del momento',
      metaDescription:
        'Guías de compra, comparativas y tendencias: nuestros artículos explican qué comprar, para quién y cuándo no hace falta. Con fuentes citadas.',
      all: 'Todo',
      noArticles: 'Ningún artículo por ahora — ¡vuelve pronto!',
    },
    guidePage: {
      metaTitle: 'Guía de compra: comprar online con seguridad',
      metaDescription:
        'Cómo saber si una tienda es fiable, detectar reseñas falsas, pagar con seguridad y conocer tus derechos: nuestra guía de compra para comprar online sin sustos.',
      moreGuides: 'Más guías de compra',
      readGuide: 'Leer la guía',
    },
    product: {
      locale: 'es-ES',
      breadcrumbAria: 'Ruta de navegación',
      breadcrumbHome: 'Inicio',
      availableOn: (s) => `Disponible en ${s}`,
      seeOffer: (s) => (s ? `Ver la oferta en ${s}` : 'Ver la oferta'),
      seeOfferShort: 'Ver la oferta',
      redirectNote:
        'Serás redirigido al sitio del vendedor. Tendpick puede recibir una comisión, sin coste adicional para ti.',
      securePayment: 'Pago seguro gestionado por el vendedor',
      deliveryMerchant: 'Envío gestionado por el vendedor',
      tabDescription: 'Descripción',
      tabPoints: 'Puntos fuertes',
      tabFaq: 'Preguntas frecuentes',
      whyChosen: 'Por qué lo hemos elegido',
      inBrief: 'En resumen',
      briefMarket: 'Mercado',
      briefSoldBy: 'Vendido por',
      briefCategory: 'Categoría',
      pointsTitle: 'Puntos fuertes',
      faqTitle: 'Preguntas frecuentes',
      relatedTitle: 'También te puede gustar',
      photoAria: (n, total) => `Mostrar la foto ${n} de ${total}`,
      prevPhoto: 'Foto anterior',
      nextPhoto: 'Foto siguiente',
      zoomHint: 'Pasa el ratón para ampliar',
      noPhoto: 'Foto próximamente',
      galleryAria: 'Fotos del producto',
    },
    bio: {
      title: 'Nuestras selecciones',
      productCount: (n) => `${n} producto${n !== 1 ? 's' : ''} cuidadosamente seleccionados`,
      noProduct: 'Ningún producto disponible por el momento.',
      affiliateFooter: 'Enlaces de afiliados ·',
    },
    global: {
      siteTitleDefault: 'Tendpick — Los mejores productos del momento',
      siteDescription: 'Tendpick selecciona los mejores productos de Amazon para ti. Fichas detalladas, fuentes citadas y selección actualizada.',
    },
  },

  uk: {
    nav: {
      homeAria: 'Tendpick, home',
      topVentes: 'Best Sellers',
      buyingGuide: "Buying guide",
      blog: 'Blog',
      seeAll: 'See all',
      searchPlaceholder: 'Search for a product…',
      searchAria: 'Search',
      cartAria: (n) => `Cart, ${n} item${plural(n)}`,
      cartTitle: 'Cart — coming soon',
      menuAria: 'Menu',
      categoriesLabel: 'Categories',
      cartLabel: 'Cart',
      itemCount: (n) => `${n} item${plural(n)}`,
    },
    footer: {
      tagline: 'The trending products comparison site, every market.',
      categoriesLabel: 'Categories',
      allCatalog: 'Full catalogue',
      help: 'Help',
      about: 'About',
      method: 'Our method',
      partners: 'Partnerships',
      legalMentions: 'Legal notice',
      privacy: 'Privacy',
      contact: 'Contact',
      newsletter: 'Newsletter',
      newsletterSub: 'The best finds, once a week',
      emailPlaceholder: 'you@email.com',
      newsletterButtonTitle: 'Newsletter — coming soon',
      ok: 'OK',
      copyrightPrefix: 'Affiliate selection,',
      transparencyLink: 'see our transparency policy',
    },
    hero: {
      slides: [
        {
          headlineLine1: 'New products spotted',
          headlineLine2: 'every week',
          subtitle:
            "Our tracking continuously identifies what's emerging on Amazon, Rakuten and AliExpress. Each listing sums up what matters so you can decide fast.",
        },
        {
          headlineLine1: "A selection that's considered,",
          headlineLine2: 'never improvised',
          subtitle:
            "Every product listed here goes through a set of criteria before it's added. We prioritise relevance over quantity.",
        },
        {
          headlineLine1: "The products everyone's talking about",
          headlineLine2: 'on social media',
          subtitle:
            'We track trends emerging on social media and show you the products behind them, with a full listing so you can judge for yourself.',
        },
        {
          headlineLine1: 'A verified selection,',
          headlineLine2: 'you can trust',
          subtitle: 'Every product listed is checked before publishing. No false promises — just reliable information.',
        },
      ],
      slideAria: (i) => `Go to banner ${i}`,
    },
    common: {
      priceAtMerchant: 'Price at merchant',
      seeArrow: 'View →',
      topPrefix: 'Top',
    },
    home: {
      emptyPlatform: 'Selection coming soon for this platform.',
      seeFullTopVentes: 'See all Best Sellers →',
      momentSelection: 'Picked right now',
      seeAllProducts: 'See all products →',
      blogTeaserTitle: 'Visit our blog',
      exploreCategoryDesc: 'Our articles in this category',
      ourAdvice: 'Our advice',
      fromBlog: 'From the blog',
      blogImageAlt: 'Article image',
      readArticle: 'Read the article →',
      seeAllBlog: 'See all articles →',
      howItWorks: 'How it works',
      steps: [
        { emoji: '🔍', title: 'We research', desc: "Every week we review the best-selling products online to find what's most popular and best rated." },
        { emoji: '✍️', title: 'We write it up', desc: 'For every product we build a full listing: key benefits, FAQ, customer reviews and buying advice to help you decide.' },
        { emoji: '🛒', title: 'You buy', desc: 'One click takes you straight to the retailer page, safely.' },
      ],
    },
    category: {
      metaDescription: (name) =>
        `${name}: our current pick, with what justifies each product. Kept up to date.`,
      productCount: (n) => `${n} product${plural(n)} selected`,
      newSoon: 'New products coming soon to this category',
      preparing: 'Selection coming together…',
      comeBackDays: 'Check back in a few days!',
    },
    products: {
      metaTitle: 'Product catalogue',
      metaDescription: 'Discover every product selected by Tendpick: the best online sellers with detailed listings.',
      resultsFor: (q) => `Results for "${q}"`,
      ourSelection: 'Our selection',
      productCountUpdated: (n) => `${n} product${plural(n)} selected — updated weekly`,
      noResultsQuery: 'No products match this search',
      newSoon: 'New products coming soon',
      backToCatalog: '← See the full catalogue',
      nothingFor: (q) => `Nothing matches "${q}".`,
      firstSelectionPreparing: 'Our first selection is coming together…',
      comeBackHours: 'Check back in a few hours!',
    },
    topVentesPage: {
      metaTitle: 'Best Sellers',
      metaDescription: 'The most popular products, ranked by platform: Amazon, Rakuten, AliExpress.',
      productCountAmong: (n) => `${n} product${plural(n)} among the most popular`,
      preparing: 'Selection coming soon',
      all: 'All',
      nonePlatform: 'No products yet on this platform.',
    },
    blogPage: {
      metaTitle: 'Blog: buying guides and what is trending',
      metaDescription:
        'Buying guides, comparisons and trends: our articles explain what to buy, who it suits and when to skip it. Sources cited, no products tested.',
      all: 'All',
      noArticles: 'No articles yet — check back soon!',
    },
    guidePage: {
      metaTitle: 'Buying guide: how to shop online safely',
      metaDescription:
        'Spot fake websites and reviews, pay safely and know your rights: our buying guide for shopping online with confidence.',
      moreGuides: 'More buying guides',
      readGuide: 'Read the guide',
    },
    product: {
      locale: 'en-GB',
      breadcrumbAria: 'Breadcrumb',
      breadcrumbHome: 'Home',
      availableOn: (s) => `Available on ${s}`,
      seeOffer: (s) => (s ? `See the offer on ${s}` : 'See the offer'),
      seeOfferShort: 'See the offer',
      redirectNote:
        "You'll be redirected to the merchant's site. Tendpick may earn a commission at no extra cost to you.",
      securePayment: 'Secure payment handled by the merchant',
      deliveryMerchant: 'Delivery by the merchant',
      tabDescription: 'Description',
      tabPoints: 'Key features',
      tabFaq: 'FAQ',
      whyChosen: 'Why we picked it',
      inBrief: 'At a glance',
      briefMarket: 'Market',
      briefSoldBy: 'Sold by',
      briefCategory: 'Category',
      pointsTitle: 'Key features',
      faqTitle: 'Frequently asked questions',
      relatedTitle: 'You might also like',
      photoAria: (n, total) => `Show photo ${n} of ${total}`,
      prevPhoto: 'Previous photo',
      nextPhoto: 'Next photo',
      zoomHint: 'Hover to zoom',
      noPhoto: 'Photo coming soon',
      galleryAria: 'Product photos',
    },
    bio: {
      title: 'Our picks',
      productCount: (n) => `${n} carefully selected product${n !== 1 ? 's' : ''}`,
      noProduct: 'No products available right now.',
      affiliateFooter: 'Affiliate links ·',
    },
    global: {
      siteTitleDefault: 'Tendpick — The best products right now',
      siteDescription: 'Tendpick selects the best Amazon products for you. Detailed listings, cited sources, and a regularly updated selection.',
    },
  },
};
