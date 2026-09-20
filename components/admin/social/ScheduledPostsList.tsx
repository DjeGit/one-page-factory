'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { getMarketLabel } from '@/lib/market';
import type { Market } from '@/lib/market';

interface ScheduledPost {
  id: string;
  channel_ids: string[];
  text: string;
  market: Market;
  scheduled_at: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  result: { channelId: string; ok: boolean; message: string }[] | null;
}

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Programmé',
  sent: 'Envoyé',
  failed: 'Échec',
  cancelled: 'Annulé',
};

export interface ScheduledPostsListHandle {
  refresh: () => void;
}

// Liste des posts programmés (Admin > Réseaux sociaux) — statut et
// annulation. Rafraîchissable depuis l'extérieur (après une programmation
// réussie dans SocialComposer) via la ref exposée.
const ScheduledPostsList = forwardRef<ScheduledPostsListHandle>((_props, ref) => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/social/schedule');
      if (res.ok) setPosts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useImperativeHandle(ref, () => ({ refresh: fetchPosts }), [fetchPosts]);

  const handleCancel = async (id: string) => {
    if (!confirm('Annuler ce post programmé ?')) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/social/schedule/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) fetchPosts();
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-400 text-center py-6">Chargement...</div>;
  }
  if (posts.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-6">Aucun post programmé.</div>;
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <div key={post.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGES[post.status]}`}>
                {STATUS_LABELS[post.status]}
              </span>
              <span className="text-xs text-gray-500">{getMarketLabel(post.market)}</span>
              <span className="text-xs text-gray-400">{post.channel_ids.join(', ')}</span>
              <span className="text-xs text-gray-400">{new Date(post.scheduled_at).toLocaleString('fr-FR')}</span>
            </div>
            <p className="text-sm text-gray-700 truncate">{post.text}</p>
            {post.status === 'failed' && post.result && (
              <p className="text-xs text-red-600 mt-1">
                {post.result.filter((r) => !r.ok).map((r) => `${r.channelId}: ${r.message}`).join(' · ')}
              </p>
            )}
          </div>
          {post.status === 'pending' && (
            <button
              onClick={() => handleCancel(post.id)}
              disabled={cancellingId === post.id}
              className="shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40"
            >
              Annuler
            </button>
          )}
        </div>
      ))}
    </div>
  );
});

ScheduledPostsList.displayName = 'ScheduledPostsList';
export default ScheduledPostsList;
