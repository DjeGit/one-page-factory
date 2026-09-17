/**
 * AWIN (ex-Affiliate Window) — réseau affilié n°1 en Europe, gratuit.
 * https://wiki.awin.com/index.php/Product_Feed_Management
 *
 * Fonctionne par flux produit (datafeed CSV/XML) par marchand rejoint, pas
 * par une recherche "trending" globale — chaque marchand publie son propre
 * feed identifié par un fid (Feed ID). TODO une fois le compte AWIN actif :
 * renseigner les fid des marchands FR/ES/UK pertinents dans
 * config.feedIds (colonne `config` jsonb de la table `integrations`,
 * modifiable depuis /admin/settings/integrations) plutôt qu'en dur ici.
 */
import type { Market } from '@/lib/market';
import type { DataSourceClient, RawProductSignal, ConnectionTestResult } from '@/lib/integrations/types';
import { getIntegrationConfig } from '@/lib/integrations/registry';

function apiToken(): string | undefined {
  return process.env.AWIN_API_TOKEN;
}

const awinClient: DataSourceClient = {
  id: 'awin',
  displayName: 'AWIN',

  isConfigured(): boolean {
    return Boolean(apiToken());
  },

  async fetchTrendingProducts(market: Market): Promise<RawProductSignal[]> {
    const token = apiToken();
    if (!token) throw new Error('AWIN non configuré (AWIN_API_TOKEN manquant).');

    const config = await getIntegrationConfig('awin') as { feedIds?: Partial<Record<Market, string[]>> } | null;
    const feedIds: string[] = config?.feedIds?.[market] || [];
    if (feedIds.length === 0) {
      throw new Error(
        `Aucun feed AWIN configuré pour le marché ${market}. Renseigner config.feedIds.${market} ` +
        `dans les paramètres d'intégration (liste des fid marchands rejoints sur ce marché).`
      );
    }

    const signals: RawProductSignal[] = [];
    for (const fid of feedIds) {
      const url =
        `https://productdata.awin.com/datafeed/download/apikey/${token}/language/any/fid/${fid}` +
        `/columns/aw_deep_link,product_name,description,aw_image_url,search_price,currency,merchant_category` +
        `/format/csv/delimiter/%2C/compression/gzip/adultcontent/0/`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) continue; // un feed en erreur ne bloque pas les autres
      const csvText = await res.text();
      const rows = csvText.split('\n').slice(1, 31); // limite raisonnable par feed
      for (const row of rows) {
        const [link, name, , image, price, currency] = row.split(',');
        if (!name) continue;
        signals.push({
          source: 'awin',
          market,
          name: name.replace(/"/g, ''),
          price: price ? parseFloat(price) : null,
          currency: currency || (market === 'uk' ? 'GBP' : 'EUR'),
          image,
          url: link,
        });
      }
    }
    return signals;
  },

  async testConnection(): Promise<ConnectionTestResult> {
    if (!apiToken()) return { ok: false, message: 'AWIN_API_TOKEN absent des variables d\'environnement.' };
    // AWIN n'a pas d'endpoint "ping" dédié simple — on valide via l'API
    // Advertiser (liste des programmes rejoints), qui nécessite le même token.
    try {
      const res = await fetch('https://api.awin.com/publishers?accessToken=' + apiToken(), {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { ok: false, message: `AWIN a répondu HTTP ${res.status}.` };
      return { ok: true, message: 'Token AWIN valide.' };
    } catch (err) {
      return { ok: false, message: `Erreur de connexion AWIN : ${(err as Error).message}` };
    }
  },
};

export default awinClient;
