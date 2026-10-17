/**
 * Pages de confiance (18/10) : À propos, Méthode, Contact, Partenariats.
 *
 * Pourquoi elles existent : Skimlinks exige des pages À propos et Contact
 * publiques, Awin refuse surtout les sites qui ressemblent à une coquille
 * anonyme, et Google juge un site d'affiliation sur le « qui » et le
 * « comment ». Le contenu est volontairement factuel : nous ne testons pas
 * les produits et la page Méthode le dit en toutes lettres, comme le font
 * les éditeurs comparables qui n'ont pas de laboratoire.
 *
 * Même structure pour les trois marchés (fr/es/uk) : le rendu est générique
 * (components/layout/ContentPage.tsx), seules les chaînes changent ici.
 * Les chemins d'URL restent en français sur les trois domaines, comme les
 * pages légales existantes.
 */
import type { Market } from '@/lib/market';

export interface PageSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface PageLink {
  label: string;
  href: string;
}

export interface StaticPageCopy {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string[];
  sections: PageSection[];
  related?: PageLink[];
  relatedLabel?: string;
  backHome: string;
}

export type StaticPageKey = 'about' | 'method' | 'contact' | 'partners';

export const PAGES_COPY: Record<Market, Record<StaticPageKey, StaticPageCopy>> = {
  fr: {
    about: {
      h1: "À propos de Tendpick",
      metaTitle: "À propos : qui est derrière le site",
      metaDescription:
        "Tendpick repère les produits qui montent et explique comment ils sont choisis. Qui édite le site, comment il est financé, et ce qu'il ne fait pas.",
      intro: [
        "Tendpick est un site de sélection de produits. Nous repérons ce qui se vend et ce qui monte dans nos univers produit — tech, maison, mode et beauté, sport et bien-être, art et design, gaming, loisirs — et nous expliquons pourquoi un produit vaut le détour, ou pas.",
        "Le site est édité par Jérôme, son fondateur, depuis l'Espagne. C'est un projet indépendant, mené à une personne, sans rédaction externalisée ni investisseur.",
      ],
      sections: [
        {
          heading: "Pourquoi ce site existe",
          paragraphs: [
            "Chercher un objet simple est devenu épuisant : des pages de résultats qui se ressemblent, des avis douteux, des comparatifs recopiés les uns sur les autres. L'idée de Tendpick est de faire ce tri une fois, de le présenter clairement, et de dire d'où vient l'information.",
            "Nous ne cherchons pas à tout couvrir. Une sélection courte, à jour et expliquée est plus utile qu'un catalogue de mille références.",
          ],
        },
        {
          heading: "Ce que nous faisons, et ce que nous ne faisons pas",
          paragraphs: [
            "Nous analysons les données publiques des marchands, les avis d'acheteurs, les tendances de vente et les tests publiés par la presse spécialisée. Nous ne testons pas les produits, ni en laboratoire ni à domicile, et nous ne le laissons jamais entendre.",
            "La page Méthode détaille les critères, les sources et les limites de cet exercice.",
          ],
        },
        {
          heading: "Comment le site est financé",
          paragraphs: [
            "Tendpick vit de l'affiliation : si vous achetez chez un marchand après avoir suivi un de nos liens, nous percevons une commission. Le prix que vous payez est exactement le même.",
            "En tant que Partenaire du programme Amazon, nous réalisons un bénéfice sur les achats remplissant les conditions requises.",
            "Aucune marque ne peut acheter une place dans un classement. Un produit mieux rémunéré n'est pas mieux placé.",
          ],
        },
        {
          heading: "Trois sites, trois marchés",
          paragraphs: [
            "tendpick.com est la version internationale en anglais, tendpick.fr couvre la France et tendpick.es l'Espagne. Les sélections diffèrent d'un pays à l'autre : la disponibilité et les prix ne sont pas les mêmes.",
          ],
        },
      ],
      relatedLabel: "À lire aussi",
      related: [
        { label: "Comment nous choisissons les produits", href: "/methode" },
        { label: "Nous écrire", href: "/contact" },
        { label: "Partenariats", href: "/partenariats" },
      ],
      backHome: "Retour à l'accueil",
    },
    method: {
      h1: "Comment nous choisissons les produits",
      metaTitle: "Méthode : comment nous choisissons les produits",
      metaDescription:
        "Critères de sélection, sources utilisées, place de l'IA, ce que nous refusons et pourquoi nous n'affichons pas de note. Dit en clair.",
      intro: [
        "Cette page explique comment une sélection Tendpick est faite, avec quelles sources, et ce que nous refusons de faire. Elle vaut pour les trois sites.",
        "Une sélection n'est pas figée : nous la revoyons dès qu'un prix, une disponibilité ou un modèle change, et nous corrigeons la page plutôt que de la laisser vieillir.",
      ],
      sections: [
        {
          heading: "Testons-nous les produits ? Non",
          paragraphs: [
            "Nous n'avons ni laboratoire ni protocole de test, donc nous n'écrivons jamais qu'un produit a été essayé. Voici ce que nous faisons à la place :",
          ],
          bullets: [
            "les fiches et caractéristiques techniques publiées par les fabricants ;",
            "les avis d'acheteurs, lus en volume et pas seulement les mieux notés ;",
            "les tests publiés par des médias spécialisés, cités et liés dans nos articles ;",
            "les classements de ventes publics des marchands et les tendances de recherche, pour repérer ce qui monte vraiment ;",
            "les prix relevés chez plusieurs marchands au moment où nous écrivons, pour ne pas présenter comme une promotion un prix habituel.",
          ],
        },
        {
          heading: "Nos critères de sélection",
          bullets: [
            "l'utilité réelle : à qui ce produit sert, et dans quel cas il ne sert à rien ;",
            "le rapport qualité-prix à son niveau de gamme, pas dans l'absolu ;",
            "la fiabilité, d'après les retours d'acheteurs sur la durée et le service après-vente ;",
            "la disponibilité chez un marchand sérieux, dans le pays concerné ;",
            "la fraîcheur : un modèle encore vendu, pas remplacé depuis six mois ;",
            "l'honnêteté du prix affiché au moment où nous écrivons.",
          ],
          paragraphs: [
            "Une sélection n'est pas exhaustive. Nous retenons une poignée de produits par besoin, parmi ceux disponibles chez les marchands avec lesquels nous travaillons. Un produit excellent mais introuvable n'aide personne.",
          ],
        },
        {
          heading: "La place de l'intelligence artificielle",
          paragraphs: [
            "Une partie de nos textes est rédigée avec l'aide d'outils d'intelligence artificielle, à partir de sources que nous avons réunies nous-mêmes. Rien n'est publié sans relecture humaine : les faits, les chiffres et les liens sont vérifiés, et les sources sont citées dans l'article.",
            "Les erreurs qui passent malgré cela restent les nôtres, et nous les corrigeons.",
          ],
        },
        {
          heading: "Ce que nous refusons",
          bullets: [
            "aucune marque ne peut acheter une place dans un classement, ni faire relire un texte avant publication ;",
            "un contenu payé est signalé comme tel, en haut de page, et n'est jamais présenté comme une sélection éditoriale ;",
            "pas de note chiffrée ni d'étoiles, tant que nous ne testons pas les produits ;",
            "pas de faux avis clients, pas de compte à rebours ni de stock inventé.",
          ],
        },
        {
          heading: "Prix et disponibilité",
          paragraphs: [
            "Les prix changent vite. Celui qui compte est celui affiché chez le marchand au moment de l'achat ; sur nos pages, il est indicatif et daté quand nous l'affichons. En cas d'écart, c'est le marchand qui fait foi.",
          ],
        },
        {
          heading: "Comment nous gagnons de l'argent",
          paragraphs: [
            "Par l'affiliation, sans surcoût pour vous. Cette rémunération n'entre pas dans le choix des produits : quand le meilleur choix est un produit sur lequel nous ne gagnons rien, nous le citons quand même.",
          ],
        },
        {
          heading: "Signaler une erreur",
          paragraphs: [
            "Un prix faux, un lien mort, un produit qui n'existe plus, une affirmation discutable : écrivez à contact@tendpick.com. Nous corrigeons, et quand la correction change le sens de la page, nous le disons sur la page.",
          ],
        },
      ],
      relatedLabel: "À lire aussi",
      related: [
        { label: "À propos de Tendpick", href: "/a-propos" },
        { label: "Nous écrire", href: "/contact" },
      ],
      backHome: "Retour à l'accueil",
    },
    contact: {
      h1: "Nous écrire",
      metaTitle: "Contact : écrire à Tendpick",
      metaDescription:
        "Deux adresses, une pour les lecteurs et une pour les marques, et ce qu'il faut mettre dans votre message pour obtenir une réponse utile.",
      intro: ["Pas de formulaire ni de robot : deux adresses, lues par une personne."],
      sections: [
        {
          heading: "Lecteurs",
          paragraphs: [
            "contact@tendpick.com — une question sur une sélection, une erreur à signaler, une suggestion de produit ou de sujet d'article. Nous lisons tous les messages et répondons en général dans la semaine.",
          ],
        },
        {
          heading: "Marques, vendeurs et réseaux d'affiliation",
          paragraphs: [
            "partners@tendpick.com — présenter un produit, parler d'un programme d'affiliation ou d'un partenariat. La page Partenariats dit ce que nous acceptons et ce que nous refusons : la lire avant d'écrire fait gagner du temps à tout le monde.",
          ],
        },
        {
          heading: "Presse",
          paragraphs: ["partners@tendpick.com également, avec « presse » en objet."],
        },
        {
          heading: "Pour aller plus vite",
          bullets: [
            "le lien de la page concernée ;",
            "pour une erreur : ce que vous avez vu, et ce que vous attendiez ;",
            "le pays concerné (France, Espagne ou international) — les sélections diffèrent.",
          ],
        },
        {
          heading: "Vos données",
          paragraphs: [
            "Nous utilisons votre adresse pour vous répondre, rien d'autre. Le détail est dans la politique de confidentialité.",
          ],
        },
        {
          heading: "Éditeur du site",
          paragraphs: [
            "Tendpick est édité par Jérôme, son fondateur, depuis l'Espagne. Les informations d'immatriculation seront complétées dès la création de la structure juridique ; elles figureront dans les mentions légales.",
          ],
        },
      ],
      relatedLabel: "À lire aussi",
      related: [
        { label: "Comment nous choisissons les produits", href: "/methode" },
        { label: "Partenariats", href: "/partenariats" },
        { label: "Mentions légales", href: "/mentions-legales" },
      ],
      backHome: "Retour à l'accueil",
    },
    partners: {
      h1: "Partenariats",
      metaTitle: "Partenariats : marques, vendeurs et réseaux",
      metaDescription:
        "Ce que Tendpick accepte, ce qu'il refuse, et comment présenter un produit. Affiliation assumée, contenu payé signalé, aucune place de classement à vendre.",
      intro: [
        "Tendpick vit de l'affiliation. Nous travaillons avec des marques, des vendeurs et des réseaux, à des conditions claires et publiques.",
      ],
      sections: [
        {
          heading: "Ce que nous acceptons",
          bullets: [
            "les programmes d'affiliation : Amazon Partenaires, réseaux comme Awin, ou programmes en direct ;",
            "la présentation d'un produit pour une sélection existante ou à venir ;",
            "le prêt d'un produit, à condition que la page indique qu'il nous a été prêté et qu'il n'a pas fait l'objet d'un test de notre part ;",
            "un contenu sponsorisé, signalé en haut de page et jamais présenté comme une sélection éditoriale.",
          ],
        },
        {
          heading: "Ce que nous refusons",
          bullets: [
            "acheter une place dans un classement, une note ou une mise en avant éditoriale ;",
            "un article payé qui se fait passer pour un contenu indépendant ;",
            "l'insertion d'un lien dans un ancien article sans mention de la nature commerciale ;",
            "la relecture ou la validation d'un texte par la marque avant publication ;",
            "les produits et marchands dont nous ne pouvons pas vérifier le sérieux.",
          ],
        },
        {
          heading: "Présenter un produit",
          paragraphs: ["Écrivez à partners@tendpick.com avec :"],
          bullets: [
            "le produit et son prix public ;",
            "les pays où il est disponible ;",
            "le lien de la fiche marchand ;",
            "le programme d'affiliation, s'il y en a un ;",
            "ce qui le distingue, en une phrase.",
          ],
        },
        {
          heading: "Ce que nous sommes aujourd'hui",
          paragraphs: [
            "Trois sites — tendpick.com en anglais, tendpick.fr et tendpick.es —, nos univers produit et un blog éditorial. Le site est jeune : nous communiquons nos chiffres d'audience réels sur demande plutôt que des estimations flatteuses.",
            "Notre audience vient du référencement naturel, de nos pages thématiques et de nos comptes sociaux. Aucun trafic acheté, aucun cashback, aucune extension de navigateur, aucun détournement de code promo.",
          ],
        },
        {
          heading: "Réseaux d'affiliation",
          paragraphs: [
            "Nous sommes partenaires du programme Amazon et en cours d'inscription auprès d'autres réseaux. Pour un programme en direct, indiquez les conditions, la durée du cookie, le flux produit disponible et un contact technique.",
          ],
        },
      ],
      relatedLabel: "À lire aussi",
      related: [
        { label: "Comment nous choisissons les produits", href: "/methode" },
        { label: "À propos de Tendpick", href: "/a-propos" },
      ],
      backHome: "Retour à l'accueil",
    },
  },
  es: {
    about: {
      h1: "Sobre Tendpick",
      metaTitle: "Sobre nosotros: quién está detrás",
      metaDescription:
        "Tendpick detecta los productos que suben y explica cómo los elige. Quién edita el sitio, cómo se financia y lo que no hace.",
      intro: [
        "Tendpick es un sitio de selección de productos. Detectamos lo que se vende y lo que sube en nuestros universos de producto — tecnología, hogar, moda y belleza, deporte y bienestar, arte y diseño, gaming, ocio — y explicamos por qué un producto merece la pena, o no.",
        "El sitio lo edita Jérôme, su fundador, desde España. Es un proyecto independiente, llevado por una sola persona, sin redacción externa ni inversores.",
      ],
      sections: [
        {
          heading: "Por qué existe este sitio",
          paragraphs: [
            "Buscar un objeto sencillo se ha vuelto agotador: páginas de resultados que se parecen todas, opiniones dudosas, comparativas copiadas unas de otras. La idea de Tendpick es hacer ese filtrado una vez, presentarlo con claridad y decir de dónde viene la información.",
            "No pretendemos cubrirlo todo. Una selección corta, actualizada y explicada es más útil que un catálogo de mil referencias.",
          ],
        },
        {
          heading: "Lo que hacemos y lo que no",
          paragraphs: [
            "Analizamos los datos públicos de las tiendas, las opiniones de compradores, las tendencias de venta y las pruebas publicadas por la prensa especializada. No probamos los productos, ni en laboratorio ni en casa, y nunca damos a entender lo contrario.",
            "La página Método detalla los criterios, las fuentes y los límites de este trabajo.",
          ],
        },
        {
          heading: "Cómo se financia el sitio",
          paragraphs: [
            "Tendpick vive de la afiliación: si compras en una tienda después de seguir uno de nuestros enlaces, recibimos una comisión. El precio que pagas es exactamente el mismo.",
            "Como Afiliado de Amazon, obtenemos ingresos por las compras adscritas que cumplen los requisitos aplicables.",
            "Ninguna marca puede comprar un puesto en una clasificación. Un producto que paga más comisión no aparece mejor situado.",
          ],
        },
        {
          heading: "Tres sitios, tres mercados",
          paragraphs: [
            "tendpick.com es la versión internacional en inglés, tendpick.fr cubre Francia y tendpick.es España. Las selecciones cambian de un país a otro: la disponibilidad y los precios no son los mismos.",
          ],
        },
      ],
      relatedLabel: "También te interesa",
      related: [
        { label: "Cómo elegimos los productos", href: "/methode" },
        { label: "Escríbenos", href: "/contact" },
        { label: "Colaboraciones", href: "/partenariats" },
      ],
      backHome: "Volver al inicio",
    },
    method: {
      h1: "Cómo elegimos los productos",
      metaTitle: "Método: cómo elegimos los productos",
      metaDescription:
        "Criterios de selección, fuentes utilizadas, el papel de la IA, lo que rechazamos y por qué no publicamos notas. Dicho claramente.",
      intro: [
        "Esta página explica cómo se hace una selección de Tendpick, con qué fuentes y lo que nos negamos a hacer. Vale para los tres sitios.",
        "Una selección no es definitiva: la revisamos en cuanto cambia un precio, una disponibilidad o un modelo, y corregimos la página en lugar de dejarla envejecer.",
      ],
      sections: [
        {
          heading: "¿Probamos los productos? No",
          paragraphs: [
            "No tenemos laboratorio ni protocolo de pruebas, así que nunca escribimos que hemos probado un producto. Esto es lo que hacemos en su lugar:",
          ],
          bullets: [
            "las fichas y características técnicas publicadas por los fabricantes;",
            "las opiniones de compradores, leídas en volumen y no solo las mejor valoradas;",
            "las pruebas publicadas por medios especializados, citadas y enlazadas en nuestros artículos;",
            "las listas de ventas públicas de las tiendas y las tendencias de búsqueda, para detectar lo que sube de verdad;",
            "los precios consultados en varias tiendas en el momento de escribir, para no presentar como oferta un precio habitual.",
          ],
        },
        {
          heading: "Nuestros criterios de selección",
          bullets: [
            "la utilidad real: para quién sirve el producto y cuándo no sirve de nada;",
            "la relación calidad-precio en su gama, no en términos absolutos;",
            "la fiabilidad, según las opiniones a lo largo del tiempo y el servicio posventa;",
            "la disponibilidad en una tienda fiable, en el país correspondiente;",
            "la vigencia: un modelo que siga a la venta y que no haya sido sustituido hace meses;",
            "la honestidad del precio mostrado en el momento en que escribimos.",
          ],
          paragraphs: [
            "Una selección no es exhaustiva. Seleccionamos unos pocos productos para cada necesidad, entre los disponibles en las tiendas con las que trabajamos. Un producto excelente pero imposible de encontrar no ayuda a nadie.",
          ],
        },
        {
          heading: "El papel de la inteligencia artificial",
          paragraphs: [
            "Parte de nuestros textos se redacta con ayuda de herramientas de inteligencia artificial, a partir de fuentes que hemos reunido nosotros. Nada se publica sin revisión humana: los datos, las cifras y los enlaces se verifican, y las fuentes se citan en el artículo.",
            "Los errores que se nos escapan siguen siendo nuestros, y los corregimos.",
          ],
        },
        {
          heading: "Lo que rechazamos",
          bullets: [
            "ninguna marca puede comprar un puesto en una clasificación ni revisar un texto antes de publicarlo;",
            "un contenido pagado se señala como tal, arriba de la página, y nunca se presenta como una selección editorial;",
            "ninguna nota ni estrellas mientras no probemos los productos;",
            "ninguna opinión falsa, ninguna cuenta atrás ni stock inventado.",
          ],
        },
        {
          heading: "Precios y disponibilidad",
          paragraphs: [
            "Los precios cambian rápido. El que cuenta es el que muestra la tienda en el momento de la compra; en nuestras páginas es orientativo y fechado cuando lo mostramos. Si hay diferencia, prevalece el precio de la tienda.",
          ],
        },
        {
          heading: "Cómo ganamos dinero",
          paragraphs: [
            "Con la afiliación, sin coste adicional para ti. Esa remuneración no entra en la elección de los productos: cuando la mejor opción es un producto con el que no ganamos nada, lo citamos igual.",
          ],
        },
        {
          heading: "Avisar de un error",
          paragraphs: [
            "Un precio equivocado, un enlace roto, un producto que ya no existe, una afirmación discutible: escribe a contact@tendpick.com. Lo corregimos y, cuando la corrección cambia el sentido de la página, lo decimos en la propia página.",
          ],
        },
      ],
      relatedLabel: "También te interesa",
      related: [
        { label: "Sobre Tendpick", href: "/a-propos" },
        { label: "Escríbenos", href: "/contact" },
      ],
      backHome: "Volver al inicio",
    },
    contact: {
      h1: "Escríbenos",
      metaTitle: "Contacto: escribir a Tendpick",
      metaDescription:
        "Dos direcciones, una para lectores y otra para marcas, y qué incluir en tu mensaje para obtener una respuesta útil.",
      intro: ["Sin formularios ni robots: dos direcciones, leídas por una persona."],
      sections: [
        {
          heading: "Lectores",
          paragraphs: [
            "contact@tendpick.com — una duda sobre una selección, un error que señalar, una sugerencia de producto o de tema. Leemos todos los mensajes y respondemos normalmente en una semana.",
          ],
        },
        {
          heading: "Marcas, tiendas y redes de afiliación",
          paragraphs: [
            "partners@tendpick.com — presentar un producto, hablar de un programa de afiliación o de una colaboración. La página Colaboraciones dice lo que aceptamos y lo que rechazamos: leerla antes de escribir ahorra tiempo a todos.",
          ],
        },
        {
          heading: "Prensa",
          paragraphs: ["partners@tendpick.com también, indicando «prensa» en el asunto."],
        },
        {
          heading: "Para ir más rápido",
          bullets: [
            "el enlace de la página en cuestión;",
            "si es un error: lo que has visto y lo que esperabas;",
            "el país afectado (Francia, España o internacional) — las selecciones cambian.",
          ],
        },
        {
          heading: "Tus datos",
          paragraphs: [
            "Usamos tu dirección para responderte, nada más. El detalle está en la política de privacidad.",
          ],
        },
        {
          heading: "Editor del sitio",
          paragraphs: [
            "Tendpick lo edita Jérôme, su fundador, desde España. Los datos de registro se añadirán en cuanto exista la estructura jurídica; figurarán en el aviso legal.",
          ],
        },
      ],
      relatedLabel: "También te interesa",
      related: [
        { label: "Cómo elegimos los productos", href: "/methode" },
        { label: "Colaboraciones", href: "/partenariats" },
        { label: "Aviso legal", href: "/mentions-legales" },
      ],
      backHome: "Volver al inicio",
    },
    partners: {
      h1: "Colaboraciones",
      metaTitle: "Colaboraciones: marcas, tiendas y redes",
      metaDescription:
        "Lo que Tendpick acepta, lo que rechaza y cómo presentar un producto. Afiliación asumida, contenido pagado señalado, ningún puesto en venta.",
      intro: [
        "Tendpick vive de la afiliación. Trabajamos con marcas, vendedores y redes, en condiciones claras y públicas.",
      ],
      sections: [
        {
          heading: "Lo que aceptamos",
          bullets: [
            "los programas de afiliación: Amazon Afiliados, redes como Awin o programas directos;",
            "la presentación de un producto para una selección existente o futura;",
            "el préstamo de un producto, siempre que la página indique que nos lo han prestado y que no lo hemos sometido a pruebas;",
            "un contenido patrocinado, señalado arriba de la página y nunca presentado como selección editorial.",
          ],
        },
        {
          heading: "Lo que rechazamos",
          bullets: [
            "comprar un puesto en una clasificación, una nota o un destacado editorial;",
            "un artículo pagado que se presente como contenido independiente;",
            "insertar un enlace en un artículo antiguo sin indicar su naturaleza comercial;",
            "la revisión o validación de un texto por la marca antes de publicarlo;",
            "los productos y tiendas cuya fiabilidad no podemos verificar.",
          ],
        },
        {
          heading: "Presentar un producto",
          paragraphs: ["Escribe a partners@tendpick.com con:"],
          bullets: [
            "el producto y su precio público;",
            "los países donde está disponible;",
            "el enlace a la ficha de la tienda;",
            "el programa de afiliación, si existe;",
            "lo que lo distingue, en una frase.",
          ],
        },
        {
          heading: "Lo que somos hoy",
          paragraphs: [
            "Tres sitios — tendpick.com en inglés, tendpick.fr y tendpick.es —, nuestros universos de producto y un blog editorial. El sitio es joven: comunicamos nuestras cifras de audiencia reales a quien las pida, en lugar de estimaciones halagadoras.",
            "Nuestra audiencia viene del posicionamiento natural, de nuestras páginas temáticas y de nuestras cuentas sociales. Ningún tráfico comprado, ningún cashback, ninguna extensión de navegador, ningún uso indebido de códigos promocionales.",
          ],
        },
        {
          heading: "Redes de afiliación",
          paragraphs: [
            "Estamos dados de alta en el programa de Amazon Afiliados y tramitando el alta en otras redes. Para un programa directo, indica las condiciones, la duración de la cookie, el feed de productos disponible y un contacto técnico.",
          ],
        },
      ],
      relatedLabel: "También te interesa",
      related: [
        { label: "Cómo elegimos los productos", href: "/methode" },
        { label: "Sobre Tendpick", href: "/a-propos" },
      ],
      backHome: "Volver al inicio",
    },
  },
  uk: {
    about: {
      h1: "About Tendpick",
      metaTitle: "About: who is behind this site",
      metaDescription:
        "Tendpick spots the products that are taking off and explains how they are picked. Who runs the site, how it is funded, and what it does not do.",
      intro: [
        "Tendpick is a product selection site. We track what sells and what is taking off across our product areas — tech, home, fashion and beauty, sport and wellbeing, art and design, gaming, hobbies — and explain why a product is worth it, or not.",
        "The site is run by Jérôme, its founder, from Spain. It is an independent one-person project, with no outsourced writing and no investors.",
      ],
      sections: [
        {
          heading: "Why this site exists",
          paragraphs: [
            "Finding something simple has become exhausting: results pages that all look alike, dubious reviews, round-ups copied from one another. The idea behind Tendpick is to do that filtering once, present it clearly, and say where the information comes from.",
            "We do not try to cover everything. A short, current, explained selection is more useful than a catalogue of a thousand items.",
          ],
        },
        {
          heading: "What we do, and what we don't",
          paragraphs: [
            "We work from retailers' public data, buyer reviews, sales trends and tests published by the specialist press. We do not test products, in a lab or at home, and we never imply otherwise.",
            "Our Method page sets out the criteria, the sources and the limits of that work.",
          ],
        },
        {
          heading: "How the site is funded",
          paragraphs: [
            "Tendpick earns from affiliate commissions: if you buy from a retailer after following one of our links, we receive a commission. The price you pay is exactly the same.",
            "As an Amazon Associate we earn from qualifying purchases.",
            "No brand can buy a place in a ranking. A product that earns us a bigger commission is not placed higher.",
          ],
        },
        {
          heading: "Three sites, three markets",
          paragraphs: [
            "tendpick.com is the international English version, tendpick.fr covers France and tendpick.es covers Spain. Selections differ from one country to another, because availability and prices do.",
          ],
        },
      ],
      relatedLabel: "Read next",
      related: [
        { label: "How we choose products", href: "/methode" },
        { label: "Contact us", href: "/contact" },
        { label: "Partnerships", href: "/partenariats" },
      ],
      backHome: "Back to home",
    },
    method: {
      h1: "How we choose products",
      metaTitle: "Method: how we choose the products",
      metaDescription:
        "Selection criteria, the sources we use, the role of AI, what we refuse, and why we publish no scores. Said plainly.",
      intro: [
        "This page explains how a Tendpick selection is made, from which sources, and what we refuse to do. It applies to all three sites.",
        "A selection is not set in stone: we revisit it as soon as a price, a stock level or a model changes, and we correct the page rather than let it age.",
      ],
      sections: [
        {
          heading: "Do we test the products? No",
          paragraphs: [
            "We have no lab and no testing protocol, so we never write that a product has been tried. Here is what we do instead:",
          ],
          bullets: [
            "the specifications published by the manufacturers;",
            "buyer reviews, read in volume rather than only the best-rated ones;",
            "tests published by specialist media, cited and linked in our articles;",
            "retailers’ public bestseller rankings and search trends, to spot what is genuinely taking off;",
            "prices checked at several retailers as we write, so a normal price is never passed off as a discount.",
          ],
        },
        {
          heading: "Our selection criteria",
          bullets: [
            "real usefulness: who the product is for, and when it is no use at all;",
            "value for money within its price bracket, not in absolute terms;",
            "reliability, based on buyer feedback over time and after-sales service;",
            "availability from a credible retailer, in the country concerned;",
            "still current: a model you can still buy, not one replaced six months ago;",
            "an honest price at the time of writing.",
          ],
          paragraphs: [
            "A selection is not exhaustive. We keep a handful of products per need, among those available from the retailers we work with. An excellent product nobody can buy helps no one.",
          ],
        },
        {
          heading: "The role of artificial intelligence",
          paragraphs: [
            "Some of our text is written with the help of AI tools, from sources we have gathered ourselves. Nothing is published without human review: facts, figures and links are checked, and sources are cited in the article.",
            "Mistakes that slip through are still ours, and we correct them.",
          ],
        },
        {
          heading: "What we refuse",
          bullets: [
            "no brand can buy a place in a ranking, or review a text before publication;",
            "paid content is labelled as such at the top of the page, and never presented as an editorial selection;",
            "no scores or stars while we do not test the products;",
            "no fake customer reviews, no countdown timers, no invented stock levels.",
          ],
        },
        {
          heading: "Prices and availability",
          paragraphs: [
            "Prices move fast. The one that counts is the retailer's price at the moment of purchase; on our pages it is indicative, and dated where we show it. Where the two differ, the retailer is right.",
          ],
        },
        {
          heading: "How we make money",
          paragraphs: [
            "Through affiliate commissions, at no extra cost to you. That income does not drive which products we pick: when the best option is one we earn nothing on, we still name it.",
          ],
        },
        {
          heading: "Reporting a mistake",
          paragraphs: [
            "A wrong price, a dead link, a product that no longer exists, a claim worth challenging: write to contact@tendpick.com. We fix it, and when the fix changes the meaning of the page, we say so on the page.",
          ],
        },
      ],
      relatedLabel: "Read next",
      related: [
        { label: "About Tendpick", href: "/a-propos" },
        { label: "Contact us", href: "/contact" },
      ],
      backHome: "Back to home",
    },
    contact: {
      h1: "Contact us",
      metaTitle: "Contact: writing to Tendpick",
      metaDescription:
        "Two addresses, one for readers and one for brands, and what to put in your message to get a useful reply.",
      intro: ["No forms and no bots: two addresses, read by a person."],
      sections: [
        {
          heading: "Readers",
          paragraphs: [
            "contact@tendpick.com — a question about a selection, a mistake to report, a product or topic suggestion. We read every message and usually reply within a week.",
          ],
        },
        {
          heading: "Brands, retailers and affiliate networks",
          paragraphs: [
            "partners@tendpick.com — pitch a product, discuss an affiliate programme or a partnership. Our Partnerships page says what we accept and what we refuse; reading it first saves everyone time.",
          ],
        },
        {
          heading: "Press",
          paragraphs: ["partners@tendpick.com as well, with “press” in the subject line."],
        },
        {
          heading: "To speed things up",
          bullets: [
            "the link to the page concerned;",
            "for a mistake: what you saw, and what you expected;",
            "the country involved (France, Spain or international) — selections differ.",
          ],
        },
        {
          heading: "Your data",
          paragraphs: [
            "We use your address to reply to you, nothing else. The detail is in our privacy policy.",
          ],
        },
        {
          heading: "Who publishes this site",
          paragraphs: [
            "Tendpick is published by Jérôme, its founder, from Spain. Registration details will be added as soon as the legal entity exists; they will appear in the legal notice.",
          ],
        },
      ],
      relatedLabel: "Read next",
      related: [
        { label: "How we choose products", href: "/methode" },
        { label: "Partnerships", href: "/partenariats" },
        { label: "Legal notice", href: "/mentions-legales" },
      ],
      backHome: "Back to home",
    },
    partners: {
      h1: "Partnerships",
      metaTitle: "Partnerships: brands, retailers and networks",
      metaDescription:
        "What Tendpick accepts, what it refuses, and how to pitch a product. Affiliate funding stated, paid content labelled, no ranking for sale.",
      intro: [
        "Tendpick earns from affiliate commissions. We work with brands, retailers and networks on terms that are clear and public.",
      ],
      sections: [
        {
          heading: "What we accept",
          bullets: [
            "affiliate programmes: Amazon Associates, networks such as Awin, or direct programmes;",
            "a product pitch for an existing or planned selection;",
            "a loaned product, provided the page states that it was loaned to us and that we did not test it;",
            "sponsored content, labelled at the top of the page and never presented as an editorial selection.",
          ],
        },
        {
          heading: "What we refuse",
          bullets: [
            "buying a place in a ranking, a score or an editorial feature;",
            "a paid article passed off as independent content;",
            "inserting a link into an old article without disclosing its commercial nature;",
            "letting a brand review or approve a text before publication;",
            "products and retailers whose credibility we cannot verify.",
          ],
        },
        {
          heading: "Pitching a product",
          paragraphs: ["Write to partners@tendpick.com with:"],
          bullets: [
            "the product and its public price;",
            "the countries where it is available;",
            "a link to the retailer's page;",
            "the affiliate programme, if there is one;",
            "what sets it apart, in one sentence.",
          ],
        },
        {
          heading: "Where we are today",
          paragraphs: [
            "Three sites — tendpick.com in English, tendpick.fr and tendpick.es —, our product areas and an editorial blog. The site is young: we share our real audience figures on request rather than flattering estimates.",
            "Our audience comes from organic search, our topic pages and our social accounts. No bought traffic, no cashback, no browser extension, no misused discount codes.",
          ],
        },
        {
          heading: "Affiliate networks",
          paragraphs: [
            "We are a member of the Amazon Associates programme and are applying to other networks. For a direct programme, please include the terms, the cookie window, the product feed available and a technical contact.",
          ],
        },
      ],
      relatedLabel: "Read next",
      related: [
        { label: "How we choose products", href: "/methode" },
        { label: "About Tendpick", href: "/a-propos" },
      ],
      backHome: "Back to home",
    },
  },
};
