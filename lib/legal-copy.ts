/**
 * Pages légales (mentions légales, politique de confidentialité) en fr/es/uk.
 *
 * Avant le 24/10 elles étaient codées en dur, en français, sur les trois
 * domaines (audit « prêt pour validation » des réseaux d'affiliation). Elles
 * passent par le même rendu que les autres pages de confiance
 * (components/layout/ContentPage.tsx) pour que chaque domaine expose ses
 * textes légaux dans sa langue.
 *
 * Règles de rédaction :
 *   - aucune promesse sur des prix affichés (le site n'en affiche plus) ;
 *   - on ne nomme que les programmes d'affiliation dont l'adhésion est
 *     établie (Amazon) ; les autres sont désignés au pluriel, « au fur et à
 *     mesure de leur validation » ;
 *   - les informations d'immatriculation de l'éditeur restent à compléter
 *     (statut professionnel en cours) : ne pas inventer de mention.
 */
import type { Market } from '@/lib/market';
import type { StaticPageCopy } from '@/lib/pages-copy';

export type LegalPageKey = 'legal' | 'privacy';

export const LEGAL_COPY: Record<Market, Record<LegalPageKey, StaticPageCopy>> = {
  fr: {
    legal: {
      h1: 'Mentions légales',
      metaTitle: 'Mentions légales',
      metaDescription: "Éditeur, hébergeur, affiliation, contenu éditorial et responsabilité de Tendpick.",
      intro: ['Ces mentions valent pour les trois sites : tendpick.com, tendpick.fr et tendpick.es.'],
      sections: [
        {
          heading: 'Éditeur du site',
          paragraphs: [
            "Tendpick est édité par Jérôme, son fondateur, à titre personnel, depuis l'Espagne. Les informations d'identification complètes seront ajoutées dès la création de la structure juridique.",
            'Contact : contact@tendpick.com',
          ],
        },
        {
          heading: 'Hébergement',
          paragraphs: ['Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Allemagne.'],
        },
        {
          heading: "Affiliation",
          paragraphs: [
            "Tendpick vit de l'affiliation. Certains liens vers des marchands sont des liens affiliés : si vous achetez après avoir cliqué, nous pouvons percevoir une commission, sans supplément de prix pour vous. Nous participons au Programme Partenaires d'Amazon EU et, au fur et à mesure de leur validation, à d'autres programmes et réseaux d'affiliation.",
            "Tendpick n'affiche pas de prix sur ses pages. Le prix et la disponibilité qui comptent sont ceux de la page du marchand au moment de l'achat.",
          ],
        },
        {
          heading: 'Contenu éditorial',
          paragraphs: [
            "Tendpick publie des fiches de sélection, un blog et des guides d'achat. Une partie des textes est rédigée avec l'assistance d'outils d'intelligence artificielle ; chaque texte est relu avant publication. Nous ne testons pas les produits : la page Méthode détaille nos sources et nos limites. Les produits cités peuvent comporter des liens affiliés.",
          ],
        },
        {
          heading: 'Propriété intellectuelle',
          paragraphs: [
            "Les textes, logos et mises en page de ce site sont protégés par le droit d'auteur. Les images de produits appartiennent aux marchands et aux vendeurs tiers ; certaines photos d'illustration viennent de banques d'images libres de droits. Toute reproduction est interdite sans autorisation écrite.",
          ],
        },
        {
          heading: 'Limitation de responsabilité',
          paragraphs: [
            "Les informations de ce site sont fournies à titre informatif. Tendpick ne peut être tenu responsable des inexactitudes, erreurs ou omissions, ni des décisions prises sur leur base. Si vous voyez une erreur, écrivez-nous : nous corrigeons.",
          ],
        },
        {
          heading: 'Cookies et données personnelles',
          paragraphs: [
            "Le détail des cookies, des données collectées et de vos droits figure dans la politique de confidentialité. Vous pouvez modifier votre choix à tout moment avec le lien « Gérer les cookies » en bas de page.",
          ],
        },
      ],
      relatedLabel: 'À lire aussi',
      related: [
        { label: 'Politique de confidentialité', href: '/politique-confidentialite' },
        { label: 'Comment nous choisissons les produits', href: '/methode' },
        { label: 'Partenariats', href: '/partenariats' },
      ],
      backHome: "Retour à l'accueil",
    },
    privacy: {
      h1: 'Politique de confidentialité',
      metaTitle: 'Politique de confidentialité',
      metaDescription: 'Données collectées, cookies, durée de conservation et vos droits sur Tendpick.',
      intro: [
        'Dernière mise à jour : 24 octobre 2026.',
        "Responsable du traitement : Jérôme, éditeur de Tendpick, depuis l'Espagne (contact@tendpick.com).",
      ],
      sections: [
        {
          heading: '1. Données collectées',
          bullets: [
            'Données de navigation : pages visitées, clics sur les liens vers les marchands, durée de visite (anonymisées).',
            "Adresse e-mail : uniquement si vous la saisissez volontairement dans un formulaire ou si vous nous écrivez.",
            'Données techniques : adresse IP (hachée), type de navigateur, pays.',
          ],
        },
        {
          heading: '2. Finalités du traitement',
          bullets: [
            "mesurer l'audience et améliorer le site ;",
            "suivre les clics d'affiliation et prévenir la fraude ;",
            'mesurer des campagnes publicitaires, uniquement avec votre consentement ;',
            "répondre à vos messages ;",
            "vous envoyer des informations par e-mail si vous en avez fait la demande.",
          ],
        },
        {
          heading: '3. Cookies et technologies de suivi',
          paragraphs: ['Les technologies suivantes ne sont activées qu\'avec votre consentement :'],
          bullets: [
            'Pixel Meta (Facebook) : mesure de l\'efficacité des campagnes publicitaires ;',
            'Pixel TikTok : suivi des conversions des campagnes TikTok ;',
            'Google Tag Manager : gestionnaire de balises qui centralise le suivi.',
          ],
        },
        {
          heading: '4. Liens vers les marchands',
          paragraphs: [
            "Quand vous cliquez sur un lien vers un marchand (Amazon, par exemple), vous quittez Tendpick : le marchand ou son réseau d'affiliation peut déposer ses propres cookies, selon sa propre politique.",
            "Vous pouvez modifier ou retirer votre choix à tout moment avec le lien « Gérer les cookies » en bas de chaque page, ou en effaçant les cookies de votre navigateur.",
          ],
        },
        {
          heading: '5. Durée de conservation',
          paragraphs: [
            "Les données de navigation sont conservées 13 mois au maximum. Les adresses e-mail sont conservées jusqu'à votre demande de suppression ou de désinscription.",
          ],
        },
        {
          heading: '6. Vos droits',
          paragraphs: [
            "Conformément au règlement général sur la protection des données (RGPD), vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, de limitation et d'opposition. Pour les exercer : contact@tendpick.com.",
          ],
        },
        {
          heading: '7. Réclamations',
          paragraphs: [
            "Vous pouvez saisir l'autorité de protection des données de votre pays : en France la CNIL (cnil.fr), en Espagne l'AEPD (aepd.es), dont dépend l'éditeur, établi en Espagne.",
          ],
        },
      ],
      relatedLabel: 'À lire aussi',
      related: [
        { label: 'Mentions légales', href: '/mentions-legales' },
        { label: 'Comment nous choisissons les produits', href: '/methode' },
      ],
      backHome: "Retour à l'accueil",
    },
  },
  es: {
    legal: {
      h1: 'Aviso legal',
      metaTitle: 'Aviso legal',
      metaDescription: 'Editor, alojamiento, afiliación, contenido editorial y responsabilidad de Tendpick.',
      intro: ['Este aviso vale para los tres sitios: tendpick.com, tendpick.fr y tendpick.es.'],
      sections: [
        {
          heading: 'Editor del sitio',
          paragraphs: [
            'Tendpick está editado por Jérôme, su fundador, a título personal y desde España. Los datos de identificación completos se añadirán en cuanto se cree la estructura jurídica.',
            'Contacto: contact@tendpick.com',
          ],
        },
        {
          heading: 'Alojamiento',
          paragraphs: ['Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Alemania.'],
        },
        {
          heading: 'Afiliación',
          paragraphs: [
            'Tendpick vive de la afiliación. Algunos enlaces a tiendas son enlaces de afiliado: si compras después de hacer clic, podemos recibir una comisión, sin coste adicional para ti. Participamos en el Programa de Afiliados de Amazon EU y, a medida que se validen, en otros programas y redes de afiliación.',
            'Tendpick no muestra precios en sus páginas. El precio y la disponibilidad que cuentan son los de la página de la tienda en el momento de la compra.',
          ],
        },
        {
          heading: 'Contenido editorial',
          paragraphs: [
            'Tendpick publica fichas de selección, un blog y guías de compra. Una parte de los textos se redacta con ayuda de herramientas de inteligencia artificial; cada texto se revisa antes de publicarse. No probamos los productos: la página Método detalla nuestras fuentes y nuestros límites. Los productos citados pueden incluir enlaces de afiliado.',
          ],
        },
        {
          heading: 'Propiedad intelectual',
          paragraphs: [
            'Los textos, logotipos y diseños de este sitio están protegidos por derechos de autor. Las imágenes de los productos pertenecen a las tiendas y a los vendedores terceros; algunas fotografías de ilustración proceden de bancos de imágenes libres de derechos. Queda prohibida cualquier reproducción sin autorización escrita.',
          ],
        },
        {
          heading: 'Limitación de responsabilidad',
          paragraphs: [
            'La información de este sitio se ofrece con fines informativos. Tendpick no se hace responsable de inexactitudes, errores u omisiones, ni de las decisiones tomadas a partir de ellos. Si ves un error, escríbenos: lo corregimos.',
          ],
        },
        {
          heading: 'Cookies y datos personales',
          paragraphs: [
            'El detalle de las cookies, de los datos recogidos y de tus derechos figura en la política de privacidad. Puedes cambiar tu elección en cualquier momento con el enlace «Gestionar cookies» al pie de la página.',
          ],
        },
      ],
      relatedLabel: 'Te puede interesar',
      related: [
        { label: 'Política de privacidad', href: '/politique-confidentialite' },
        { label: 'Cómo elegimos los productos', href: '/methode' },
        { label: 'Colaboraciones', href: '/partenariats' },
      ],
      backHome: 'Volver al inicio',
    },
    privacy: {
      h1: 'Política de privacidad',
      metaTitle: 'Política de privacidad',
      metaDescription: 'Datos recogidos, cookies, plazo de conservación y tus derechos en Tendpick.',
      intro: [
        'Última actualización: 24 de octubre de 2026.',
        'Responsable del tratamiento: Jérôme, editor de Tendpick, desde España (contact@tendpick.com).',
      ],
      sections: [
        {
          heading: '1. Datos recogidos',
          bullets: [
            'Datos de navegación: páginas visitadas, clics en los enlaces a tiendas, duración de la visita (anonimizados).',
            'Correo electrónico: solo si lo escribes voluntariamente en un formulario o si nos escribes.',
            'Datos técnicos: dirección IP (con hash), tipo de navegador, país.',
          ],
        },
        {
          heading: '2. Finalidades del tratamiento',
          bullets: [
            'medir la audiencia y mejorar el sitio;',
            'seguir los clics de afiliación y prevenir el fraude;',
            'medir campañas publicitarias, solo con tu consentimiento;',
            'responder a tus mensajes;',
            'enviarte información por correo si la has solicitado.',
          ],
        },
        {
          heading: '3. Cookies y tecnologías de seguimiento',
          paragraphs: ['Las siguientes tecnologías solo se activan con tu consentimiento:'],
          bullets: [
            'Píxel de Meta (Facebook): medición de la eficacia de las campañas publicitarias;',
            'Píxel de TikTok: seguimiento de las conversiones de las campañas de TikTok;',
            'Google Tag Manager: gestor de etiquetas que centraliza el seguimiento.',
          ],
        },
        {
          heading: '4. Enlaces a tiendas',
          paragraphs: [
            'Cuando haces clic en un enlace a una tienda (Amazon, por ejemplo), sales de Tendpick: la tienda o su red de afiliación puede instalar sus propias cookies, según su propia política.',
            'Puedes cambiar o retirar tu elección en cualquier momento con el enlace «Gestionar cookies» al pie de cada página, o borrando las cookies del navegador.',
          ],
        },
        {
          heading: '5. Plazo de conservación',
          paragraphs: [
            'Los datos de navegación se conservan 13 meses como máximo. Las direcciones de correo se conservan hasta que pidas su supresión o te des de baja.',
          ],
        },
        {
          heading: '6. Tus derechos',
          paragraphs: [
            'De conformidad con el Reglamento General de Protección de Datos (RGPD), tienes derecho de acceso, rectificación, supresión, portabilidad, limitación y oposición. Para ejercerlos: contact@tendpick.com.',
          ],
        },
        {
          heading: '7. Reclamaciones',
          paragraphs: [
            'Puedes acudir a la autoridad de protección de datos de tu país: en España la AEPD (aepd.es), de la que depende el editor, establecido en España; en Francia la CNIL (cnil.fr).',
          ],
        },
      ],
      relatedLabel: 'Te puede interesar',
      related: [
        { label: 'Aviso legal', href: '/mentions-legales' },
        { label: 'Cómo elegimos los productos', href: '/methode' },
      ],
      backHome: 'Volver al inicio',
    },
  },
  uk: {
    legal: {
      h1: 'Legal notice',
      metaTitle: 'Legal notice',
      metaDescription: 'Publisher, hosting, affiliation, editorial content and liability at Tendpick.',
      intro: ['This notice applies to all three sites: tendpick.com, tendpick.fr and tendpick.es.'],
      sections: [
        {
          heading: 'Publisher',
          paragraphs: [
            'Tendpick is published by Jérôme, its founder, in a personal capacity, from Spain. Full identification details will be added once the legal entity is set up.',
            'Contact: contact@tendpick.com',
          ],
        },
        {
          heading: 'Hosting',
          paragraphs: ['Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany.'],
        },
        {
          heading: 'Affiliation',
          paragraphs: [
            'Tendpick earns from affiliate commissions. Some links to retailers are affiliate links: if you buy after clicking, we may receive a commission, at no extra cost to you. We take part in the Amazon EU Associates Programme and, as they are approved, in other affiliate programmes and networks.',
            'Tendpick does not show prices on its pages. The price and availability that count are those on the retailer’s page at the time of purchase.',
          ],
        },
        {
          heading: 'Editorial content',
          paragraphs: [
            'Tendpick publishes selection listings, a blog and buying guides. Part of the text is written with the help of artificial intelligence tools; every text is reviewed before publication. We do not test products: the Method page sets out our sources and limits. Products mentioned may include affiliate links.',
          ],
        },
        {
          heading: 'Intellectual property',
          paragraphs: [
            'The texts, logos and layouts of this site are protected by copyright. Product images belong to the retailers and third-party sellers; some illustrative photos come from royalty-free image libraries. No reproduction without written permission.',
          ],
        },
        {
          heading: 'Limitation of liability',
          paragraphs: [
            'The information on this site is provided for information only. Tendpick cannot be held responsible for inaccuracies, errors or omissions, or for decisions made on that basis. If you spot a mistake, write to us: we correct it.',
          ],
        },
        {
          heading: 'Cookies and personal data',
          paragraphs: [
            'Details of cookies, the data we collect and your rights are in the privacy policy. You can change your choice at any time with the “Manage cookies” link at the bottom of the page.',
          ],
        },
      ],
      relatedLabel: 'Read next',
      related: [
        { label: 'Privacy policy', href: '/politique-confidentialite' },
        { label: 'How we choose products', href: '/methode' },
        { label: 'Partnerships', href: '/partenariats' },
      ],
      backHome: 'Back to home',
    },
    privacy: {
      h1: 'Privacy policy',
      metaTitle: 'Privacy policy',
      metaDescription: 'Data we collect, cookies, retention periods and your rights at Tendpick.',
      intro: [
        'Last updated: 24 October 2026.',
        'Data controller: Jérôme, publisher of Tendpick, based in Spain (contact@tendpick.com).',
      ],
      sections: [
        {
          heading: '1. Data we collect',
          bullets: [
            'Browsing data: pages visited, clicks on links to retailers, length of visit (anonymised).',
            'Email address: only if you enter it voluntarily in a form or write to us.',
            'Technical data: IP address (hashed), browser type, country.',
          ],
        },
        {
          heading: '2. Why we process it',
          bullets: [
            'to measure audience and improve the site;',
            'to track affiliate clicks and prevent fraud;',
            'to measure advertising campaigns, only with your consent;',
            'to reply to your messages;',
            'to email you information if you asked for it.',
          ],
        },
        {
          heading: '3. Cookies and tracking technologies',
          paragraphs: ['The following are switched on only with your consent:'],
          bullets: [
            'Meta (Facebook) pixel: measures how well advertising campaigns perform;',
            'TikTok pixel: tracks conversions from TikTok campaigns;',
            'Google Tag Manager: a tag manager that centralises tracking.',
          ],
        },
        {
          heading: '4. Links to retailers',
          paragraphs: [
            'When you click a link to a retailer (Amazon, for example), you leave Tendpick: the retailer or its affiliate network may set its own cookies, under its own policy.',
            'You can change or withdraw your choice at any time with the “Manage cookies” link at the bottom of every page, or by clearing your browser’s cookies.',
          ],
        },
        {
          heading: '5. How long we keep it',
          paragraphs: [
            'Browsing data is kept for 13 months at most. Email addresses are kept until you ask for deletion or unsubscribe.',
          ],
        },
        {
          heading: '6. Your rights',
          paragraphs: [
            'Under the General Data Protection Regulation (GDPR) you have the right of access, rectification, erasure, portability, restriction and objection. To use them: contact@tendpick.com.',
          ],
        },
        {
          heading: '7. Complaints',
          paragraphs: [
            'You can contact the data protection authority of your country: in Spain the AEPD (aepd.es), which oversees the publisher, based in Spain; in France the CNIL (cnil.fr); in the UK the ICO (ico.org.uk).',
          ],
        },
      ],
      relatedLabel: 'Read next',
      related: [
        { label: 'Legal notice', href: '/mentions-legales' },
        { label: 'How we choose products', href: '/methode' },
      ],
      backHome: 'Back to home',
    },
  },
};
