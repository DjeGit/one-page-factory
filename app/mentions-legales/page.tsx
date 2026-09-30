import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — Tendpick',
  robots: { index: false },
};

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-site-bg text-site-text">
      <header className="border-b border-site-border bg-white">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-site-primary">
            <span className="w-2.5 h-2.5 rounded-full bg-site-cta" />
            Tendpick
          </Link>
        </div>
      </header>

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

        <h2 className="text-lg font-semibold mt-8 mb-3">Programme d&apos;affiliation Amazon</h2>
        <p className="text-site-text-secondary">
          Tendpick participe au Programme Partenaires d&apos;Amazon EU, un programme d&apos;affiliation
          conçu pour permettre à des sites de percevoir une rémunération grâce à la création de
          liens vers Amazon.fr. En tant que Partenaire Amazon, nous réalisons des bénéfices sur
          les achats remplissant les conditions requises.
        </p>
        <p className="text-site-text-secondary mt-2">
          Les prix et la disponibilité des produits indiqués sur ce site sont susceptibles de
          changer. Le prix final applicable est celui affiché sur la page Amazon au moment de l&apos;achat.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">Propriété intellectuelle</h2>
        <p className="text-site-text-secondary">
          L&apos;ensemble du contenu de ce site (textes, images, logos) est protégé par le droit
          d&apos;auteur. Les images des produits sont la propriété d&apos;Amazon et des vendeurs
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
    </div>
  );
}
