import Link from 'next/link';
import { listIntegrationsWithStatus } from '@/lib/integrations/registry';

export const dynamic = 'force-dynamic';

/**
 * Nav admin — Marketing. Distincte de "Réseaux sociaux" (publication
 * organique) : c'est ici que vivront les campagnes payantes une fois
 * l'intégration Meta Ads branchée (aujourd'hui Meta Ads API n'est câblée
 * que pour des posts de Page organiques — de vraies campagnes publicitaires
 * restent explicitement hors scope, cf. lib/integrations/social-channels/meta-ads.ts).
 * Page honnête sur l'état actuel plutôt qu'un écran de campagnes qui ne
 * ferait rien.
 */
export default async function MarketingPage() {
  const { socialChannels } = await listIntegrationsWithStatus();
  const meta = socialChannels.find((i) => i.id === 'meta-ads');
  const tiktok = socialChannels.find((i) => i.id === 'tiktok');

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Marketing</h1>
        <p className="text-gray-500 mt-1">Campagnes et diffusion payante — distinct de la publication organique.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-bold text-gray-900 mb-3">Disponible aujourd&apos;hui</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>
              Publication organique multi-canal (Postiz, Ayrshare, TikTok, Meta) —{' '}
              <Link href="/admin/social" className="text-primary-600 font-semibold hover:underline">
                Réseaux sociaux
              </Link>
              .
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">✓</span>
            <span>
              Étude de marché avec commission affiliée réelle (AWIN, Rakuten, CJ...) pour prioriser les produits les
              plus rentables — <Link href="/admin/market" className="text-primary-600 font-semibold hover:underline">Étude de marché</Link>.
            </span>
          </li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h2 className="font-bold text-amber-800 mb-2">Pas encore construit</h2>
        <p className="text-sm text-amber-700 mb-3">
          La gestion de vraies campagnes publicitaires (budget, ciblage, enchères) n&apos;est pas dans le registre
          actuel — <code className="bg-white/60 px-1 rounded">meta-ads.ts</code> ne couvre que des posts de Page
          organiques, pas l&apos;API Marketing (campagnes payantes), qui demande une vérification business Meta
          supplémentaire.
        </p>
        <p className="text-sm text-amber-700">
          Statut Meta : <strong>{meta?.configured ? (meta?.enabled ? 'activé' : 'configuré, désactivé') : 'clé API absente'}</strong> ·
          Statut TikTok : <strong>{tiktok?.configured ? (tiktok?.enabled ? 'activé' : 'configuré, désactivé') : 'clé API absente'}</strong>
        </p>
        <Link href="/admin/settings/integrations" className="inline-block mt-3 text-sm text-amber-800 font-semibold hover:underline">
          Configurer dans Intégrations →
        </Link>
      </div>
    </div>
  );
}
