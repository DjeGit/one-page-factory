/**
 * /api/social/publish (Nav admin — Réseaux sociaux)
 *
 * Publication réelle multi-canal via le registre Sprint 3
 * (lib/integrations/social-channels/) — remplace le TikTok Hub actuel qui
 * n'était qu'un outil de copier/coller manuel. Chaque canal reste
 * double-gated : configuré (clé d'env présente) ET activé (toggle DB dans
 * Admin > Paramètres > Intégrations).
 *
 * POST body : { channelIds: string[], text: string, imageUrls?: string[],
 *               videoUrl?: string, link?: string, market?: Market }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { findSocialChannel, isIntegrationEnabled, recordSyncResult } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const channelIds: string[] = Array.isArray(body.channelIds) ? body.channelIds : [];
  const text: string = typeof body.text === 'string' ? body.text.trim() : '';
  const market = isValidMarket(body.market) ? body.market : getActiveMarket();

  if (!text) {
    return NextResponse.json({ error: 'Le contenu du post est requis.' }, { status: 400 });
  }
  if (channelIds.length === 0) {
    return NextResponse.json({ error: 'Sélectionnez au moins un canal.' }, { status: 400 });
  }

  const content = {
    market,
    text,
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : undefined,
    videoUrl: typeof body.videoUrl === 'string' && body.videoUrl ? body.videoUrl : undefined,
    link: typeof body.link === 'string' && body.link ? body.link : undefined,
  };

  const results: { channelId: string; ok: boolean; message: string; postId?: string }[] = [];

  for (const channelId of channelIds) {
    const channel = findSocialChannel(channelId);
    if (!channel) {
      results.push({ channelId, ok: false, message: 'Canal inconnu.' });
      continue;
    }
    if (!channel.isConfigured()) {
      results.push({ channelId, ok: false, message: "Clé d'API absente — configurez cette intégration d'abord." });
      continue;
    }
    const enabled = await isIntegrationEnabled(channelId);
    if (!enabled) {
      results.push({ channelId, ok: false, message: 'Canal désactivé dans Paramètres > Intégrations.' });
      continue;
    }

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

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 });
}
