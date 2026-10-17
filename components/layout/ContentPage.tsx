import Link from 'next/link';
import { headers } from 'next/headers';
import { getActiveCategories } from '@/lib/supabase';
import { getMarketFromHost } from '@/lib/market-from-host';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { serializeJsonLd } from '@/lib/json-ld';
import { marketUrl } from '@/lib/site-url';
import type { StaticPageCopy } from '@/lib/pages-copy';
import type { Market } from '@/lib/market';

/**
 * Rendu commun des pages éditoriales statiques (À propos, Méthode, Contact,
 * Partenariats) : le texte vient de lib/pages-copy.ts dans la langue du
 * marché du domaine visité, la mise en page est la même partout.
 *
 * Les adresses e-mail sont transformées en liens mailto à la lecture plutôt
 * que stockées en HTML dans la copie, pour que les textes restent
 * traduisibles sans balises.
 */
const EMAIL = /([a-z0-9._%+-]+@tendpick\.com)/gi;

function withEmailLinks(text: string, keyPrefix: string) {
  return text.split(EMAIL).map((part, i) =>
    EMAIL.test(part) ? (
      <a key={`${keyPrefix}-${i}`} href={`mailto:${part}`} className="text-site-cta underline">
        {part}
      </a>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

interface Props {
  copy: StaticPageCopy;
  /** Chemin de la page, pour le fil d'Ariane structuré. */
  path: string;
}

export default async function ContentPage({ copy, path }: Props) {
  const market: Market = getMarketFromHost(headers().get('host'));
  const categories = await getActiveCategories();
  const pageUrl = marketUrl(market, path);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#page`,
        name: copy.h1,
        description: copy.metaDescription,
        url: pageUrl,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Tendpick', item: marketUrl(market, '/') },
          { '@type': 'ListItem', position: 2, name: copy.h1, item: pageUrl },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-site-bg text-site-text flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <SiteHeader categories={categories} market={market} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">{copy.h1}</h1>

        {copy.intro.map((text, i) => (
          <p key={`intro-${i}`} className="text-[15px] leading-relaxed text-site-text-secondary mb-4">
            {withEmailLinks(text, `intro-${i}`)}
          </p>
        ))}

        {copy.sections.map((section, s) => (
          <section key={`section-${s}`} className="mt-10">
            <h2 className="text-lg font-semibold mb-3">{section.heading}</h2>
            {section.paragraphs?.map((text, i) => (
              <p key={`p-${s}-${i}`} className="text-[15px] leading-relaxed text-site-text-secondary mb-3">
                {withEmailLinks(text, `p-${s}-${i}`)}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-site-text-secondary">
                {section.bullets.map((text, i) => (
                  <li key={`li-${s}-${i}`}>{withEmailLinks(text, `li-${s}-${i}`)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {copy.related && copy.related.length > 0 && (
          <nav className="mt-12 pt-6 border-t border-site-border">
            {copy.relatedLabel && (
              <span className="block text-sm font-semibold mb-2">{copy.relatedLabel}</span>
            )}
            <ul className="space-y-1.5">
              {copy.related.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-site-cta underline hover:text-site-cta-hover transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-10">
          <Link href="/" className="text-sm text-site-cta hover:text-site-cta-hover transition-colors">
            ← {copy.backHome}
          </Link>
        </div>
      </main>

      <SiteFooter categories={categories} market={market} />
    </div>
  );
}
