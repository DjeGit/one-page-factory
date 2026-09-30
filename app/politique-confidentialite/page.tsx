import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Tendpick',
  robots: { index: false },
};

export default function PolitiqueConfidentialite() {
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
        <h1 className="text-2xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-gray-500 text-sm mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2 className="text-lg font-semibold mt-8 mb-3">1. Données collectées</h2>
        <p className="text-site-text-secondary">Tendpick collecte les données suivantes :</p>
        <ul className="text-site-text-secondary mt-2 space-y-1">
          <li><strong className="text-site-primary">Données de navigation :</strong> pages visitées, clics sur les produits, durée de visite (anonymisées)</li>
          <li><strong className="text-site-primary">Adresse email :</strong> uniquement si vous la renseignez volontairement dans un formulaire de capture</li>
          <li><strong className="text-site-primary">Données techniques :</strong> adresse IP (hachée), type de navigateur, pays</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-3">2. Finalités du traitement</h2>
        <ul className="text-site-text-secondary mt-2 space-y-1">
          <li>Mesure d&apos;audience et amélioration du site</li>
          <li>Personnalisation des recommandations produits</li>
          <li>Envoi d&apos;offres promotionnelles (si vous avez fourni votre email)</li>
          <li>Prévention de la fraude aux clics d&apos;affiliation</li>
        </ul>

        <h2 className="text-lg font-semibold mt-8 mb-3">3. Cookies et technologies de suivi</h2>
        <p className="text-site-text-secondary">
          Ce site peut utiliser les technologies suivantes, soumises à votre consentement :
        </p>
        <ul className="text-site-text-secondary mt-2 space-y-1">
          <li><strong className="text-site-primary">Pixel Meta (Facebook) :</strong> pour mesurer l&apos;efficacité des campagnes publicitaires</li>
          <li><strong className="text-site-primary">Pixel TikTok :</strong> pour le suivi des conversions TikTok Ads</li>
          <li><strong className="text-site-primary">Google Tag Manager :</strong> gestionnaire de balises pour centraliser le suivi</li>
          <li><strong className="text-site-primary">Cookies Amazon :</strong> déposés lors du clic sur un lien partenaire Amazon</li>
        </ul>
        <p className="text-site-text-secondary mt-3">
          Vous pouvez retirer votre consentement à tout moment en cliquant sur «&nbsp;Gérer les cookies&nbsp;»
          en bas de chaque page, ou en effaçant les cookies de votre navigateur.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">4. Durée de conservation</h2>
        <p className="text-site-text-secondary">
          Les données de navigation sont conservées 13 mois maximum. Les adresses email
          sont conservées jusqu&apos;à désinscription.
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">5. Vos droits (RGPD)</h2>
        <p className="text-site-text-secondary">
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
          accès, rectification, effacement, portabilité, limitation et opposition au traitement.
        </p>
        <p className="text-site-text-secondary mt-2">
          Pour exercer vos droits :{' '}
          <a href="mailto:contact@tendpick.com" className="text-site-cta underline">contact@tendpick.com</a>
        </p>

        <h2 className="text-lg font-semibold mt-8 mb-3">6. Contact et réclamations</h2>
        <p className="text-site-text-secondary">
          En cas de litige, vous pouvez adresser une réclamation à la{' '}
          <a href="https://www.cnil.fr" target="_blank" rel="noopener" className="text-site-cta underline">
            CNIL (Commission Nationale de l&apos;Informatique et des Libertés)
          </a>.
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
