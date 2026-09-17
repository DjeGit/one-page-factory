/**
 * Postiz — outil de publication réseaux sociaux open-source, self-hosted
 * sur le Hetzner existant (gratuit). https://postiz.com/ · API publique :
 * https://docs.postiz.com/public-api
 * Nécessite une instance Postiz déployée (POSTIZ_INSTANCE_URL) + une clé
 * API générée dans cette instance (POSTIZ_API_KEY).
 */
import type { SocialChannelClient, SocialPostContent, ConnectionTestResult } from '@/lib/integrations/types';

function instanceUrl(): string | undefined {
  return process.env.POSTIZ_INSTANCE_URL; // ex. https://postiz.tondomaine.com
}
function apiKey(): string | undefined {
  return process.env.POSTIZ_API_KEY;
}

const postizClient: SocialChannelClient = {
  id: 'postiz',
  displayName: 'Postiz (self-hosted)',

  isConfigured(): boolean {
    return Boolean(instanceUrl() && apiKey());
  },

  async publish(content: SocialPostContent) {
    const base = instanceUrl();
    const key = apiKey();
    if (!base || !key) return { ok: false, message: 'Postiz non configuré (POSTIZ_INSTANCE_URL / POSTIZ_API_KEY manquants).' };

    const res = await fetch(`${base}/public/v1/posts`, {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: content.text,
        media: [...(content.imageUrls || []), ...(content.videoUrl ? [content.videoUrl] : [])],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, message: `Postiz HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, postId: data?.id, message: 'Publié via Postiz.' };
  },

  async testConnection(): Promise<ConnectionTestResult> {
    const base = instanceUrl();
    const key = apiKey();
    if (!base || !key) return { ok: false, message: 'POSTIZ_INSTANCE_URL / POSTIZ_API_KEY absents.' };
    try {
      const res = await fetch(`${base}/public/v1/integrations`, {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok
        ? { ok: true, message: 'Instance Postiz joignable.' }
        : { ok: false, message: `Instance Postiz a répondu HTTP ${res.status}.` };
    } catch (err) {
      return { ok: false, message: `Postiz injoignable : ${(err as Error).message}` };
    }
  },
};

export default postizClient;
