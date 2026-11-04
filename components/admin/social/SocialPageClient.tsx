'use client';

import { useRef } from 'react';
import Link from 'next/link';
import SocialComposer from './SocialComposer';
import ScheduledPostsList, { type ScheduledPostsListHandle } from './ScheduledPostsList';

/**
 * Contenu de la page Réseaux sociaux (composant client ; la page serveur app/admin/social/page.tsx
 * porte la garde d'authentification).
 * Nav admin — Réseaux sociaux. Publication réelle multi-canal via le
 * registre Sprint 3 (Postiz/Ayrshare/TikTok/Meta), au-delà du TikTok Hub
 * existant qui reste disponible pour la génération de script/copier-coller
 * manuel (utile même une fois la publication automatique branchée).
 * Composant client (pas de dynamic='force-dynamic' nécessaire) car il n'a
 * besoin que d'orchestrer le rafraîchissement de la liste programmée après
 * une programmation réussie dans le composeur.
 */
export default function SocialPageClient() {
  const scheduledListRef = useRef<ScheduledPostsListHandle>(null);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Réseaux sociaux</h1>
          <p className="text-gray-500 mt-1">Publiez directement sur les canaux activés — aucun copier/coller.</p>
        </div>
        <Link href="/admin/tiktok" className="text-sm text-primary-600 font-semibold hover:underline whitespace-nowrap">
          TikTok Hub (scripts) →
        </Link>
      </div>

      <SocialComposer onScheduled={() => scheduledListRef.current?.refresh()} />

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Posts programmés</h2>
        <ScheduledPostsList ref={scheduledListRef} />
      </div>
    </div>
  );
}
