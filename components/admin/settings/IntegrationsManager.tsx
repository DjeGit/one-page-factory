'use client';

import { useEffect, useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { INTEGRATION_DESCRIPTIONS } from '@/lib/integrations/labels';

interface Entry {
  id: string;
  displayName: string;
  category: 'data_source' | 'social_channel';
  configured: boolean;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastStatus: 'ok' | 'error' | 'never_run';
  lastError: string | null;
}

function StatusBadge({ configured, enabled }: { configured: boolean; enabled: boolean }) {
  if (!configured) {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Non configurée</span>;
  }
  return enabled ? (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Activée</span>
  ) : (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Configurée — désactivée</span>
  );
}

function IntegrationRow({ entry, onChanged }: { entry: Entry; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const toggle = useCallback(async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${entry.id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !entry.enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult({ ok: false, message: data.error || 'Erreur' });
      } else {
        onChanged();
      }
    } finally {
      setBusy(false);
    }
  }, [entry, onChanged]);

  const test = useCallback(async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/integrations/${entry.id}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } finally {
      setBusy(false);
    }
  }, [entry]);

  return (
    <div className="flex items-start gap-4 py-4 px-5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{entry.displayName}</span>
          <StatusBadge configured={entry.configured} enabled={entry.enabled} />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{INTEGRATION_DESCRIPTIONS[entry.id] || ''}</p>
        {entry.lastSyncedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Dernière sync : {new Date(entry.lastSyncedAt).toLocaleString('fr-FR')} — {entry.lastStatus === 'ok' ? '✅ OK' : '❌ erreur'}
          </p>
        )}
        {testResult && (
          <p className={clsx('text-xs mt-1.5 font-medium', testResult.ok ? 'text-green-600' : 'text-red-600')}>
            {testResult.ok ? '✅' : '⚠️'} {testResult.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={test}
          disabled={busy}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Tester la connexion
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={busy || !entry.configured}
          title={!entry.configured ? "Ajoute la clé API dans .env.local d'abord" : undefined}
          className={clsx(
            'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
            entry.enabled ? 'bg-primary-600' : 'bg-gray-300',
            (busy || !entry.configured) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={clsx(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
              entry.enabled && 'translate-x-5'
            )}
          />
        </button>
      </div>
    </div>
  );
}

export default function IntegrationsManager({
  initialDataSources,
  initialSocialChannels,
}: {
  initialDataSources: Entry[];
  initialSocialChannels: Entry[];
}) {
  const [dataSources, setDataSources] = useState(initialDataSources);
  const [socialChannels, setSocialChannels] = useState(initialSocialChannels);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/integrations');
    if (!res.ok) return;
    const data = await res.json();
    setDataSources(data.dataSources);
    setSocialChannels(data.socialChannels);
  }, []);

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900">Sources de données — étude de marché</h2>
          <p className="text-sm text-gray-500">Toutes désactivées par défaut. Ajoute la clé API correspondante dans .env.local puis active ici — aucun abonnement n&apos;est engagé automatiquement.</p>
        </div>
        {dataSources.map((entry) => (
          <IntegrationRow key={entry.id} entry={entry} onChanged={refresh} />
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-900">Canaux de diffusion — réseaux sociaux</h2>
          <p className="text-sm text-gray-500">Même logique : configurée puis activée manuellement, jamais par défaut.</p>
        </div>
        {socialChannels.map((entry) => (
          <IntegrationRow key={entry.id} entry={entry} onChanged={refresh} />
        ))}
      </section>
    </div>
  );
}
