'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMarket } from '@/lib/market-context';
import { getMarketLabel } from '@/lib/market';

interface IntegrationStatus {
  id: string;
  displayName: string;
  category: 'data_source' | 'social_channel' | 'orchestration';
  configured: boolean;
  enabled: boolean;
}

interface ProductOption {
  id: string;
  name: string;
  slug: string;
}

interface SocialComposerProps {
  /** Rafraîchit la liste des posts programmés après une programmation réussie. */
  onScheduled?: () => void;
}

/**
 * Composeur de publication réelle multi-canal — remplace le TikTok Hub
 * (copier/coller manuel) par un vrai appel au registre Sprint 3 via
 * /api/social/publish, avec un choix Publier maintenant / Programmer (ce
 * second cas passe par /api/social/schedule — voir ScheduledPostsList
 * pour le suivi/l'annulation des posts programmés). N'affiche que les
 * canaux configurés ET activés (double-gate cohérent avec le registre).
 */
export default function SocialComposer({ onScheduled }: SocialComposerProps) {
  const { market } = useMarket();
  const [channels, setChannels] = useState<IntegrationStatus[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ channelId: string; ok: boolean; message: string }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [integrationsRes, productsRes] = await Promise.all([fetch('/api/integrations'), fetch('/api/products')]);
      const integrations: { socialChannels: IntegrationStatus[] } = await integrationsRes.json();
      const activeChannels = (integrations.socialChannels || []).filter((i) => i.configured && i.enabled);
      setChannels(activeChannels);
      setProducts(await productsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, market]);

  const toggleChannel = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const handleProductPick = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const base = process.env.NEXT_PUBLIC_SITE_URL || '';
    setLink(`${base}/${product.slug}`);
  };

  const handlePublish = async () => {
    setSubmitting(true);
    setResults(null);
    setScheduleMessage(null);
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds: selected,
          text,
          link: link || undefined,
          imageUrls: imageUrl ? [imageUrl] : undefined,
          market,
        }),
      });
      const json = await res.json();
      setResults(json.results || [{ channelId: '?', ok: false, message: json.error || 'Erreur inconnue' }]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchedule = async () => {
    setSubmitting(true);
    setResults(null);
    setScheduleMessage(null);
    try {
      const res = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds: selected,
          text,
          link: link || undefined,
          imageUrls: imageUrl ? [imageUrl] : undefined,
          market,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setScheduleMessage(`Erreur : ${json.error ?? 'inconnue'}`);
      } else {
        setScheduleMessage(`Post programmé pour le ${new Date(json.scheduled_at).toLocaleString('fr-FR')}.`);
        setText('');
        setLink('');
        setImageUrl('');
        setScheduledAt('');
        onScheduled?.();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">Chargement...</div>;
  }

  if (channels.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-3">📱</div>
        <p className="text-gray-600 font-medium mb-1">Aucun canal social actif</p>
        <p className="text-gray-400 text-sm mb-4">
          Activez Postiz, Ayrshare, TikTok ou Meta dans Paramètres &gt; Intégrations pour publier depuis ici.
        </p>
        <a href="/admin/settings/integrations" className="text-primary-600 font-semibold text-sm hover:underline">
          Aller aux Intégrations →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Canaux ({getMarketLabel(market)})</p>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleChannel(c.id)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                selected.includes(c.id) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500'
              }`}
            >
              {c.displayName}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Message</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Le texte du post..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Lien vers un produit</label>
          <select
            onChange={(e) => handleProductPick(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            defaultValue=""
          >
            <option value="" disabled>
              Choisir un produit...
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Lien (auto ou personnalisé)</label>
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Image (URL, optionnel)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Quand</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('now')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              mode === 'now' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Publier maintenant
          </button>
          <button
            type="button"
            onClick={() => setMode('schedule')}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              mode === 'schedule' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Programmer
          </button>
        </div>
        {mode === 'schedule' && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-3 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        )}
      </div>

      {results && (
        <div className="space-y-1">
          {results.map((r) => (
            <div
              key={r.channelId}
              className={`text-sm px-3 py-2 rounded-lg ${r.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
            >
              <strong>{r.channelId}</strong> — {r.message}
            </div>
          ))}
        </div>
      )}
      {scheduleMessage && (
        <div className={`text-sm px-3 py-2 rounded-lg ${scheduleMessage.startsWith('Erreur') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {scheduleMessage}
        </div>
      )}

      <div className="flex justify-end">
        {mode === 'now' ? (
          <button
            onClick={handlePublish}
            disabled={submitting || selected.length === 0 || !text.trim()}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Publication...' : `Publier sur ${selected.length || 0} canal(aux)`}
          </button>
        ) : (
          <button
            onClick={handleSchedule}
            disabled={submitting || selected.length === 0 || !text.trim() || !scheduledAt}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {submitting ? 'Programmation...' : `Programmer sur ${selected.length || 0} canal(aux)`}
          </button>
        )}
      </div>
    </div>
  );
}
