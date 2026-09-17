interface ApiStatus {
  serpapi: boolean;
  keepa: boolean;
  dataforseo: boolean;
  awin: boolean;
}

const API_INFO = [
  {
    key: 'serpapi' as keyof ApiStatus,
    name: 'SerpApi',
    icon: '📈',
    description: 'Google Trends & recherches',
    docUrl: 'https://serpapi.com/',
    envVar: 'SERPAPI_KEY',
  },
  {
    key: 'keepa' as keyof ApiStatus,
    name: 'Keepa',
    icon: '💰',
    description: "Historique prix Amazon",
    docUrl: 'https://keepa.com/#!api',
    envVar: 'KEEPA_API_KEY',
  },
  {
    key: 'dataforseo' as keyof ApiStatus,
    name: 'DataForSEO',
    icon: '🔍',
    description: 'Search volume & mots-clés',
    docUrl: 'https://dataforseo.com/',
    envVar: 'DATAFORSEO_LOGIN',
  },
  {
    key: 'awin' as keyof ApiStatus,
    name: 'AWIN',
    icon: '🤝',
    description: 'Réseau affilié européen',
    docUrl: 'https://www.awin.com/fr',
    envVar: 'AWIN_API_KEY',
  },
];

export default function ApiStatusPanel({ status }: { status: ApiStatus }) {
  const connectedCount = Object.values(status).filter(Boolean).length;

  return (
    <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900 text-sm">APIs connectées</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {connectedCount}/{API_INFO.length} services actifs
          </p>
        </div>
        <a
          href="/admin/settings"
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          Gérer →
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {API_INFO.map((api) => {
          const isConnected = status[api.key];
          return (
            <div
              key={api.key}
              className={`rounded-xl p-3 border transition-all ${
                isConnected
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{api.icon}</span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-green-200 text-green-800'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  {isConnected ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{api.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{api.description}</p>
              {!isConnected && (
                <a
                  href={api.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-primary-600 hover:underline font-medium"
                >
                  Obtenir une clé →
                </a>
              )}
              {!isConnected && (
                <p className="text-xs text-gray-300 mt-1 font-mono">{api.envVar}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
