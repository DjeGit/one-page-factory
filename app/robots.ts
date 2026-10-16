import { headers } from 'next/headers';
import type { MetadataRoute } from 'next';
import { getRequestHost, getRequestOrigin, isBackofficeHost, isTendpickHost } from '@/lib/site-url';

// Audit SEO du 07/10 (C4) : le même robots.txt était servi sur les trois
// domaines avec un `Sitemap:` figé sur tendpick.com. Désormais chaque
// domaine annonce SON sitemap, et le domaine de back-office n'est jamais
// exploré. Lit les en-têtes de la requête, donc dynamique par nature.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const h = headers();
  const host = getRequestHost(h);

  // Back-office (one-page-factory.com) : rien à indexer.
  if (isBackofficeHost(host)) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  const rules = [
    {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/backoffice', '/api/', '/preview/'],
    },
  ];

  // Hôte inconnu (localhost, test) : pas de sitemap annoncé vers un domaine de prod.
  if (!isTendpickHost(host)) {
    return { rules };
  }

  return { rules, sitemap: `${getRequestOrigin(h)}/sitemap.xml` };
}
