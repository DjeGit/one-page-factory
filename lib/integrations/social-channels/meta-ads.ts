/**
 * Meta Ads API — création de campagnes Facebook/Instagram. Gratuite à
 * l'accès, vérification business Meta requise.
 * https://developers.facebook.com/docs/marketing-apis/
 *
 * Ici : "publish" crée un post organique simple sur la Page liée (pas une
 * campagne payante — la création de campagnes Ads proprement dite est un
 * chantier Sprint "Marketing" séparé, plus complexe : budgets, ciblage,
 * approbation créative — volontairement hors du scope minimal de ce
 * registre d'intégrations).
 */
import type { SocialChannelClient, SocialPostContent, ConnectionTestResult } from '@/lib/integrations/types';

function pageAccessToken(): string | undefined {
  return process.env.META_PAGE_ACCESS_TOKEN;
}
function pageId(): string | undefined {
  return process.env.META_PAGE_ID;
}

const metaAdsClient: SocialChannelClient = {
  id: 'meta-ads',
  displayName: 'Meta (Facebook/Instagram)',

  isConfigured(): boolean {
    return Boolean(pageAccessToken() && pageId());
  },

  async publish(content: SocialPostContent) {
    const token = pageAccessToken();
    const page = pageId();
    if (!token || !page) return { ok: false, message: 'Meta non configuré (META_PAGE_ACCESS_TOKEN / META_PAGE_ID manquants).' };

    const endpoint = content.imageUrls?.[0]
      ? `https://graph.facebook.com/v20.0/${page}/photos`
      : `https://graph.facebook.com/v20.0/${page}/feed`;
    const body = content.imageUrls?.[0]
      ? { url: content.imageUrls[0], caption: content.text, access_token: token }
      : { message: content.text, link: content.link, access_token: token };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return { ok: false, message: `Meta Graph API HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, postId: data?.id, message: 'Publié sur la Page Meta.' };
  },

  async testConnection(): Promise<ConnectionTestResult> {
    const token = pageAccessToken();
    const page = pageId();
    if (!token || !page) return { ok: false, message: 'META_PAGE_ACCESS_TOKEN / META_PAGE_ID absents.' };
    try {
      const res = await fetch(`https://graph.facebook.com/v20.0/${page}?fields=name&access_token=${token}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, message: `Meta a répondu HTTP ${res.status}.` };
      const data = await res.json();
      return { ok: true, message: `Connecté à la Page "${data.name}".` };
    } catch (err) {
      return { ok: false, message: `Erreur Meta : ${(err as Error).message}` };
    }
  },
};

export default metaAdsClient;
