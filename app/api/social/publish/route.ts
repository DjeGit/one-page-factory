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
 *
 * Statuts : 200 tous les canaux ont publié ; 207 résultat mixte ; 502 aucun canal n'a publié
 * (la réponse porte toujours `results`, canal par canal).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getActiveMarket } from '@/lib/get-active-market';
import { isValidMarket } from '@/lib/market';
import { findSocialChannel, isIntegrationEnabled, recordSyncResult } from '@/lib/integrations/registry';
import { isAuthorizedRequest } from '@/lib/admin-auth';
import { badRequest, readJsonObject, unauthorized } from '../../_lib/http';
import { parseSocialInput } from '../../_lib/social-input';

export async function POST(req: NextRequest) {
  if (!isAuthorizedRequest(req)) return unauthorized();

  const parsed = await readJsonObject(req);
  if ('response' in parsed) return parsed.response;
  const input = parseSocialInput(parsed.body);
  if ('error' in input) return badRequest(input.error);

  const market = isValidMarket(parsed.body.market as string) ? (parsed.body.market as 'fr' | 'es' | 'uk') : getActiveMarket();
  const { channelIds, text, imageUrls, videoUrl, link } = input.data;
  const content = { market, text, imageUrls, videoUrl, link };

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

  const okCount = results.filter((r) => r.ok).length;
  const allOk = okCount === results.length;
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : okCount > 0 ? 207 : 502 });
}
