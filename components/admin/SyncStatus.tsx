import Link from 'next/link';

interface MarketCounts {
  fr: number;
  es: number;
  com: number;
}

interface SyncStatusProps {
  lastRefreshed: string | null;   // from market_products.last_refreshed
  productsByMarket: MarketCounts;
  n8nActive: boolean;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Il y a < 1h';
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

function StatusDot({ date, maxHours = 25 }: { date: string | null; maxHours?: number }) {
  if (!date) return <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />;
  const h = (Date.now() - new Date(date).getTime()) / 3600000;
  const color = h < maxHours ? 'bg-green-500' : h < maxHours * 2 ? 'bg-amber-400' : 'bg-red-400';
  return <span className={`w-2 h-2 rounded-full ${color} inline-block animate-pulse`} />;
}

export default function SyncStatus({ lastRefreshed, productsByMarket, n8nActive }: SyncStatusProps) {
  const total = productsByMarket.fr + productsByMarket.es + productsByMarket.com;

  return (
    <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Automatisations &amp; Sync</h2>
          <p className="text-xs text-gray-400 mt-0.5">Statut des workflows n8n</p>
        </div>
        <a
          href="https://one-page-factory.com/n8n/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Ouvrir n8n →
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Dernière sync */}
        <div className="flex items-start gap-2.5">
          <div className="mt-1">
            <StatusDot date={lastRefreshed} maxHours={25} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Dernière sync</p>
            <p className="font-semibold text-gray-900 text-sm">{timeAgo(lastRefreshed)}</p>
            <p className="text-xs text-gray-400">market_products</p>
          </div>
        </div>

        {/* Prix (cron schedule info) */}
        <div className="flex items-start gap-2.5">
          <div className="mt-1">
            <span className={`w-2 h-2 rounded-full inline-block ${n8nActive ? 'bg-blue-400' : 'bg-gray-300'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Sync prix</p>
            <p className="font-semibold text-gray-900 text-sm">{n8nActive ? 'Planifié' : 'Inactif'}</p>
            <p className="text-xs text-gray-400">Quotidien · 06h00</p>
          </div>
        </div>

        {/* Disponibilité */}
        <div className="flex items-start gap-2.5">
          <div className="mt-1">
            <span className={`w-2 h-2 rounded-full inline-block ${n8nActive ? 'bg-blue-400' : 'bg-gray-300'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Disponibilité</p>
            <p className="font-semibold text-gray-900 text-sm">{n8nActive ? 'Planifié' : 'Inactif'}</p>
            <p className="text-xs text-gray-400">Toutes les 6h</p>
          </div>
        </div>

        {/* Produits par marché */}
        <div className="flex items-start gap-2.5">
          <div className="mt-1">
            <span className={`w-2 h-2 rounded-full inline-block ${total > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Produits indexés</p>
            <p className="font-semibold text-gray-900 text-sm">{total}</p>
            <p className="text-xs text-gray-400">
              🇫🇷{productsByMarket.fr} · 🇪🇸{productsByMarket.es} · 🌍{productsByMarket.com}
            </p>
          </div>
        </div>
      </div>

      {/* n8n badge */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${n8nActive ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">
            n8n · {n8nActive ? '4 workflows actifs — sync automatique OK' : 'Connexion perdue'}
          </span>
        </div>
        <Link href="/admin/market" className="text-xs text-gray-400 hover:text-gray-600">
          Étude de marché →
        </Link>
      </div>
    </div>
  );
}
