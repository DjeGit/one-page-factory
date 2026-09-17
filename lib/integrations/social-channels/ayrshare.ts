/**
 * Ayrshare — SaaS de publication multi-réseaux (~29$/mois).
 * https://www.ayrshare.com/docs/apis/post/post
 */
import type { SocialChannelClient, SocialPostContent, ConnectionTestResult } from '@/lib/integrations/types';

function apiKey(): string | undefined {
  return process.env.AYRSHARE_API_KEY;
}

const ayrshareClient: SocialChannelClient = {
  id: 'ayrshare',
  displayName: 'Ayrshare',

  isConfigured(): boolean {
    return Boolean(apiKey());
  },

  async publish(content: SocialPostContent) {
    const key = apiKey();
    if (!key) return { ok: false, message: 'AYRSHARE_API_KEY absente.' };

    const res = await fetch('https://app.ayrshare.com/api/post', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        post: content.text,
        platforms: ['instagram', 'pinterest', 'facebook'],
        mediaUrls: content.imageUrls || (content.videoUrl ? [content.videoUrl] : []),
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, message: `Ayrshare HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, postId: data?.id, message: 'Publié via Ayrshare.' };
  },

  async testConnection(): Promise<ConnectionTestResult> {
    const key = apiKey();
    if (!key) return { ok: false, message: 'AYRSHARE_API_KEY absente.' };
    try {
      const res = await fetch('https://app.ayrshare.com/api/user', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      });
      return res.ok ? { ok: true, message: 'Connexion Ayrshare OK.' } : { ok: false, message: `Ayrshare a répondu HTTP ${res.status}.` };
    } catch (err) {
      return { ok: false, message: `Erreur Ayrshare : ${(err as Error).message}` };
    }
  },
};

export default ayrshareClient;
