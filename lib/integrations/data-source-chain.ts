/**
 * Agrège les signaux de TOUTES les sources de données activées pour un
 * marché — contrairement au fallback strict de lib/ai.ts (un seul
 * provider actif à la fois), on CUMULE ici les sources sérieuses plutôt
 * que de basculer seulement en cas de panne. Consommé par Sprint 4
 * (app/api/market/refresh).
 */
import type { Market } from '@/lib/market';
import type { RawProductSignal } from '@/lib/integrations/types';
import { DATA_SOURCES, isIntegrationEnabled, recordSyncResult } from '@/lib/integrations/registry';

export interface AggregatedRefreshResult {
  signals: RawProductSignal[];
  sourcesUsed: string[];
  sourcesSkipped: { id: string; reason: string }[];
}

/**
 * Renvoie les sources à la fois CONFIGURÉES (clé d'env présente) ET
 * ACTIVÉES (toggle DB `enabled = true`) — double condition, cf. registry.ts.
 */
export async function getActiveDataSources(): Promise<string[]> {
  const active: string[] = [];
  for (const source of DATA_SOURCES) {
    if (!source.isConfigured()) continue;
    if (await isIntegrationEnabled(source.id)) active.push(source.id);
  }
  return active;
}

export async function refreshMarketFromActiveSources(
  market: Market,
  category?: string
): Promise<AggregatedRefreshResult> {
  const signals: RawProductSignal[] = [];
  const sourcesUsed: string[] = [];
  const sourcesSkipped: { id: string; reason: string }[] = [];

  for (const source of DATA_SOURCES) {
    if (!source.isConfigured()) {
      sourcesSkipped.push({ id: source.id, reason: 'non configurée (clé d\'env absente)' });
      continue;
    }
    const enabled = await isIntegrationEnabled(source.id);
    if (!enabled) {
      sourcesSkipped.push({ id: source.id, reason: 'désactivée' });
      continue;
    }

    try {
      const results = await source.fetchTrendingProducts(market, category);
      signals.push(...results);
      sourcesUsed.push(source.id);
      await recordSyncResult(source.id, 'ok');
    } catch (err) {
      sourcesSkipped.push({ id: source.id, reason: (err as Error).message });
      await recordSyncResult(source.id, 'error', (err as Error).message);
    }
  }

  return { signals, sourcesUsed, sourcesSkipped };
}
