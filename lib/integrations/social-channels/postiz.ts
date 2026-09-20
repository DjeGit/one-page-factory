/**
 * Postiz — outil de publication réseaux sociaux open-source, self-hosted
 * sur le Hetzner existant (gratuit) ou cloud. https://postiz.com/ · API
 * publique : https://docs.postiz.com/public-api
 * Nécessite une instance Postiz (POSTIZ_INSTANCE_URL) + une clé API générée
 * dans cette instance (POSTIZ_API_KEY) + l'id du compte connecté à cibler
 * (POSTIZ_INTEGRATION_ID) — voir isConfigured() plus bas.
 *
 * Audit 21/09 (bug CRITIQUE corrigé) : la version précédente envoyait
 * uniquement { content, media } à POST /public/v1/posts, sans jamais
 * préciser SUR QUEL compte connecté publier. L'API publique de Postiz
 * exige un objet `posts[].integration.id` — sans lui, l'appel échoue (ou,
 * selon l'implémentation serveur, pourrait cibler le mauvais compte). Le
 * schéma exact ci-dessous est celui documenté par Postiz (confirmé via
 * https://docs.postiz.com/public-api, vérifié le 21/09) :
 *   {
 *     type: 'now' | 'schedule',
 *     date: '2026-...T...Z',
 *     posts: [{
 *       integration: { id: '<integration-id>' },
 *       value: [{ content, image }],
 *       settings: { __type: '<platform identifier>' }
 *     }]
 *   }
 * L'identifiant de plateforme (`settings.__type`, ex. 'x'/'instagram') est
 * résolu dynamiquement via GET /public/v1/integrations plutôt que codé en
 * dur, puisqu'on ne sait pas à l'avance sur quel type de compte
 * POSTIZ_INTEGRATION_ID pointe.
 */
import type { SocialChannelClient, SocialPostContent, ConnectionTestResult } from '@/lib/integrations/types';

function instanceUrl(): string | undefined {
  return process.env.POSTIZ_INSTANCE_URL; // ex. https://postiz.tondomaine.com ou https://api.postiz.com (cloud)
}
function apiKey(): string | undefined {
  return process.env.POSTIZ_API_KEY;
}
/** Id du compte/canal connecté à cibler (onglet "Channels" de Postiz, ou GET /public/v1/integrations). */
function integrationId(): string | undefined {
  return process.env.POSTIZ_INTEGRATION_ID;
}

interface PostizIntegration {
  id: string;
  identifier?: string; // ex. 'x', 'instagram', 'linkedin'
  name?: string;
}

/** Best-effort : récupère l'identifiant de plateforme du compte ciblé, pour settings.__type. */
async function resolvePlatformIdentifier(base: string, key: string, id: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${base}/public/v1/integrations`, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return undefined;
    const list = (await res.json()) as PostizIntegration[] | { data?: PostizIntegration[] };
    const arr = Array.isArray(list) ? list : list?.data ?? [];
    return arr.find((i) => i.id === id)?.identifier;
  } catch {
    return undefined;
  }
}

const postizClient: SocialChannelClient = {
  id: 'postiz',
  displayName: 'Postiz',

  isConfigured(): boolean {
    return Boolean(instanceUrl() && apiKey() && integrationId());
  },

  async publish(content: SocialPostContent) {
    const base = instanceUrl();
    const key = apiKey();
    const id = integrationId();
    if (!base || !key || !id) {
      return {
        ok: false,
        message: 'Postiz non configuré (POSTIZ_INSTANCE_URL / POSTIZ_API_KEY / POSTIZ_INTEGRATION_ID manquant).',
      };
    }

    const platformIdentifier = await resolvePlatformIdentifier(base, key, id);
    const media = [...(content.imageUrls || []), ...(content.videoUrl ? [content.videoUrl] : [])];

    const res = await fetch(`${base}/public/v1/posts`, {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'now',
        date: new Date().toISOString(),
        tags: [],
        posts: [
          {
            integration: { id },
            value: [{ content: content.text, image: media }],
            ...(platformIdentifier ? { settings: { __type: platformIdentifier } } : {}),
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, message: `Postiz HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}` };
    }
    const data = await res.json().catch(() => null);
    const postId = data?.postId ?? data?.id ?? (Array.isArray(data) ? data[0]?.id : undefined);
    return { ok: true, postId, message: 'Publié via Postiz.' };
  },

  async testConnection(): Promise<ConnectionTestResult> {
    const base = instanceUrl();
    const key = apiKey();
    const id = integrationId();
    if (!base || !key) return { ok: false, message: 'POSTIZ_INSTANCE_URL / POSTIZ_API_KEY absents.' };
    try {
      const res = await fetch(`${base}/public/v1/integrations`, {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, message: `Instance Postiz a répondu HTTP ${res.status}.` };
      if (!id) {
        return { ok: false, message: 'Instance Postiz joignable, mais POSTIZ_INTEGRATION_ID absent — aucun compte cible configuré.' };
      }
      const list = (await res.json()) as PostizIntegration[] | { data?: PostizIntegration[] };
      const arr = Array.isArray(list) ? list : list?.data ?? [];
      const match = arr.find((i) => i.id === id);
      if (!match) {
        return { ok: false, message: `Instance Postiz joignable, mais aucun compte connecté ne correspond à POSTIZ_INTEGRATION_ID="${id}".` };
      }
      return { ok: true, message: `Instance Postiz joignable — cible : ${match.name || match.identifier || match.id}.` };
    } catch (err) {
      return { ok: false, message: `Postiz injoignable : ${(err as Error).message}` };
    }
  },
};

export default postizClient;
