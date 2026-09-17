/**
 * TikTok Content Posting API — officielle, gratuite.
 * https://developers.tiktok.com/doc/content-posting-api-get-started/
 *
 * ⚠️ Tant que le compte développeur n'est pas audité par TikTok, tout
 * contenu publié via l'API reste en visibilité PRIVÉE, quel que soit le
 * paramètre demandé — l'audit prend 2 à 6 semaines et doit être soumis dès
 * que possible, indépendamment de l'avancement du code (cf. plan Sprint 3).
 * Auth OAuth2 (TIKTOK_CLIENT_KEY/SECRET + refresh token obtenu via le flux
 * d'autorisation TikTok, à faire une fois manuellement).
 */
import type { SocialChannelClient, SocialPostContent, ConnectionTestResult } from '@/lib/integrations/types';

function clientKey(): string | undefined {
  return process.env.TIKTOK_CLIENT_KEY;
}
function clientSecret(): string | undefined {
  return process.env.TIKTOK_CLIENT_SECRET;
}
function refreshToken(): string | undefined {
  return process.env.TIKTOK_REFRESH_TOKEN;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: clientKey()!,
      client_secret: clientSecret()!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken()!,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`TikTok oauth HTTP ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

const tiktokClient: SocialChannelClient = {
  id: 'tiktok',
  displayName: 'TikTok Content Posting API',

  isConfigured(): boolean {
    return Boolean(clientKey() && clientSecret() && refreshToken());
  },

  async publish(content: SocialPostContent) {
    if (!this.isConfigured()) return { ok: false, message: 'TikTok non configuré.' };
    if (!content.videoUrl) return { ok: false, message: 'TikTok exige une vidéo — aucune videoUrl fournie.' };

    try {
      const token = await getAccessToken();
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_info: { title: content.text, privacy_level: 'SELF_ONLY' }, // reste privé tant que le compte n'est pas audité
          source_info: { source: 'PULL_FROM_URL', video_url: content.videoUrl },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return { ok: false, message: `TikTok HTTP ${res.status}` };
      const data = await res.json();
      return { ok: true, postId: data?.data?.publish_id, message: 'Vidéo soumise à TikTok (visibilité privée tant que le compte n\'est pas audité).' };
    } catch (err) {
      return { ok: false, message: `Erreur TikTok : ${(err as Error).message}` };
    }
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.isConfigured()) return { ok: false, message: 'TIKTOK_CLIENT_KEY / SECRET / REFRESH_TOKEN absents.' };
    try {
      await getAccessToken();
      return { ok: true, message: 'Token TikTok obtenu — rappel : audit de compte requis pour la visibilité publique (2-6 semaines).' };
    } catch (err) {
      return { ok: false, message: `Erreur TikTok : ${(err as Error).message}` };
    }
  },
};

export default tiktokClient;
