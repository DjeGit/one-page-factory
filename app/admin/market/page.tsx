import MarketPageTabs from '@/components/admin/market/MarketPageTabs';

// Sprint 4 : la page ne pré-charge plus market_products côté serveur pour
// des catégories GPT fixes (5 catégories inventées) — chaque onglet
// charge désormais ses propres données réelles, filtrées par marché actif
// (cf. MesRecherches.tsx / AmazonBestSellers.tsx).
export const dynamic = 'force-dynamic';

export default function MarketPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Étude de marché</h1>
        <p className="text-gray-500 mt-1">
          Sources de données réelles et traçables · Filtré par marché actif · Ajout manuel à tout moment
        </p>
      </div>

      <MarketPageTabs />
    </div>
  );
}
