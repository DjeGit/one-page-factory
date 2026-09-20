/**
 * /api/cron/social-publish (module de publication sociale programmée,
 * rapport 18/09, étape 4)
 *
 * Sélectionne les posts scheduled_posts 'pending' dont scheduled_at est
 * passé, et les publie réellement — en appelant EXACTEMENT le même chemin
 * que /api/social/publish (findSocialChannel().publish(), même double-gate
 * configuré+activé, même enregistrement recordSyncResult), pour ne jamais
 * dupliquer cette logique. À appeler périodiquement (crontab serveur, voir
 * pipeline-cron.sh — case "social-publish").
 *
 * Auth : même pattern que les autres routes /api/cron/* et /api/*
 * appelées en admin — isAuthorizedRequest (cookie admin OU secret Bearer).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { isValidMarket } from '@/lib/market';
import { findSocialChannel, isIntegrationEnabled, recordSyncResult } from '@/lib/integrations/registry';

interface ScheduledPostRow {
  id: string;
  channel_ids: string[];
  text: string;
  image_urls: string[] | null;
  video_url: string | null;
  link: string | null;
  market: string;
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  const { data: due, error } = await sb
    .from('scheduled_posts')
    .select('id, channel_ids, text, image_urls, video_url, link, market')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const processed: { id: string; status: 'sent' | 'failed'; results: unknown[] }[] = [];

  for (const post of (due || []) as ScheduledPostRow[]) {
    const market = isValidMarket(post.market) ? post.market : 'fr';
    const content = {
      market,
      text: post.text,
      imageUrls: post.image_urls ?? undefined,
      videoUrl: post.video_url ?? undefined,
      link: post.link ?? undefined,
    };

    const results: { channelId: string; ok: boolean; message: string; postId?: string }[] = [];
    for (const channelId of post.channel_ids) {
      const channel = findSocialChannel(channelId);
      if (!channel) { results.push({ channelId, ok: false, message: 'Canal inconnu.' }); continue; }
      if (!channel.isConfigured()) { results.push({ channelId, ok: false, message: "Clé d'API absente." }); continue; }
      const enabled = await isIntegrationEnabled(channelId);
      if (!enabled) { results.push({ channelId, ok: false, message: 'Canal désactivé.' }); continue; }
      try {
        const res = await channel.publish(content);
        await recordSyncResult(channelId, res.ok ? 'ok' : 'error', res.ok ? undefined : res.message);
        results.push({ channelId, ...res });
      } catch (err) {
        const message = (err as Error).message;
        await recordSyncResult(channelId, 'error', message);
        results.push({ channelId, ok: false, message });
      }
    }

    const finalStatus: 'sent' | 'failed' = results.every((r) => r.ok) ? 'sent' : 'failed';
    // Transition conditionnée sur status='pending' encore actuel : si deux
    // exécutions du cron se chevauchaient, la seconde écrase le même
    // résultat plutôt que de republier (la boucle ci-dessus tourne quand
    // même deux fois dans ce cas de figure rare — accepté vu le volume
    // attendu, pas de verrou dédié pour cette v1).
    await sb.from('scheduled_posts').update({ status: finalStatus, result: results }).eq('id', post.id).eq('status', 'pending');
    processed.push({ id: post.id, status: finalStatus, results });
  }

  return NextResponse.json({ processed: processed.length, posts: processed });
}
