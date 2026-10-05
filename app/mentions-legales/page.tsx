import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getActiveCategories } from '@/lib/supabase';
import { getMarketFromHost } from '@/lib/market-from-host';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mentions légales — Tendpick',
  robots: { index: false },
};

export default async function MentionsLegales() {
  const market = getMarketFromHost(headers().get('host'));
  const categories = await getActiveCategories();

  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <SiteHeader categories={categories} market={market} />

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-sm">
        <h1 className="text-2xl font-bold mb-8">Mentions légales</h1>

        <h2 className="text-lg font-semibold mt-8 mb-3">Éditeur du site</h2>
        <p className="text-site-text-secondary">
          Le site Tendpick (tendpick.com) est édité à titre personnel.<br />
          Pour nous contacter : <a href="mailto:contact@tendpick.com" className="text-site-cta underline">contact@tendpick.com</a>
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Hébergement</h2>
        <p className="text-site-text-secondary">
          Ce site est hébergé par :<br />
          <strong className="text-site-primary">Hetzner Online GmbH</strong><br />
          Industriestr. 25, 91710 Gunzenhausen, Allemagne
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Programmes d&apos;affiliation</h2>
        <p className="text-site-text-secondary">
          Tendpick participe à plusieurs programmes d&apos;affiliation, dont le Programme Partenaires
          d&apos;Amazon EU, ainsi que des programmes équivalents avec Rakuten et AliExpress. Ces
          programmes permettent à des sites de percevoir une rémunération grâce à la création de
          liens vers ces marchands. En tant que partenaire affilié, nous réalisons des bénéfices sur
          les achats remplissant les conditions requises, sans surcoût pour l&apos;acheteur.
        </p>
        <p className="text-site-text-secondary mt-2">
          Les prix et la disponibilité des produits indiqués sur ce site sont susceptibles de
          changer. Le prix final applicable est celui affiché sur la page du marchand au moment de l&apos;achat.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Contenu éditorial (Blog)</h2>
        <p className="text-site-text-secondary">
          Tendpick publie un blog consacré aux produits tendance, au high-tech et à des guides
          d&apos;achat. Certains articles sont rédigés avec l&apos;assistance d&apos;outils d&apos;intelligence
          artificielle ; dans tous les cas, chaque article est relu et validé avant publication.
          Les produits mentionnés dans un article peuvent inclure des liens affiliés, soumis aux
          mêmes programmes que ceux listés ci-dessus.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Propriété intellectuelle</h2>
        <p className="text-site-text-secondary">
          L&apos;ensemble du contenu de ce site (textes, images, logos) est protégé par le droit
          d&apos;auteur. Les images des produits sont la propriété des marchands et des vendeurs
          tiers. Toute reproduction est interdite sans autorisation écrite.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Limitation de responsabilité</h2>
        <p className="text-site-text-secondary">
          Les informations présentes sur ce site sont fournies à titre informatif. Tendpick
          ne peut être tenu responsable des inexactitudes, erreurs ou omissions dans le contenu.
          Nous déclinons toute responsabilité quant aux décisions prises sur la base des
          informations présentées.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Cookies et données personnelles</h2>
        <p className="text-site-text-secondary">
          Pour plus d&apos;informations sur l&apos;utilisation de vos données, consultez notre{' '}
          <Link href="/politique-confidentialite" className="text-site-cta underline">
            politique de confidentialité
          </Link>.
        </p>

        <div className="mt-12 pt-6 border-t border-site-border">
          <Link href="/" className="text-site-cta text-sm hover:text-site-cta-hover transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </main>

      <SiteFooter categories={categories} market={market} />
    </div>
  );
}
