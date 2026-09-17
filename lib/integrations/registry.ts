/**
 * Registre central des intégrations — la liste STATIQUE des sources/canaux
 * connus (définie ici, dans le code) est séparée de leur état RUNTIME
 * (table `integrations` en DB, Sprint 3 — enabled/disabled, dernière sync).
 * Pattern calqué sur lib/ai.ts : la présence de la variable d'env décide
 * si une intégration est "configurable", le toggle DB décide si elle est
 * "autorisée à tourner" — les deux conditions sont nécessaires.
 */
import { getSupabaseAdmin } from '@/lib/supabase';
import type { DataSourceClient, SocialChannelClient } from '@/lib/integrations/types';

import keepa from '@/lib/integrations/data-sources/keepa';
import dataforseo from '@/lib/integrations/data-sources/dataforseo';
import amazonCreators from '@/lib/integrations/data-sources/amazon-creators';
import awin from '@/lib/integrations/data-sources/awin';
import rakuten from '@/lib/integrations/data-sources/rakuten';
import cjAffiliate from '@/lib/integrations/data-sources/cj-affiliate';
import aliexpress from '@/lib/integrations/data-sources/aliexpress';
import googleTrends from '@/lib/integrations/data-sources/google-trends';
import serpapi from '@/lib/integrations/data-sources/serpapi';
import jungleScout from '@/lib/integrations/data-sources/jungle-scout';
import canopy from '@/lib/integrations/data-sources/canopy';
import amazonScrapingFallback from '@/lib/integrations/data-sources/amazon-scraping-fallback';

import postiz from '@/lib/integrations/social-channels/postiz';
import ayrshare from '@/lib/integrations/social-channels/ayrshare';
import tiktok from '@/lib/integrations/social-channels/tiktok';
import metaAds from '@/lib/integrations/social-channels/meta-ads';

export const DATA_SOURCES: DataSourceClient[] = [
  keepa,
  dataforseo,
  amazonCreators,
  awin,
  rakuten,
  cjAffiliate,
  aliexpress,
  googleTrends,
  serpapi,
  jungleScout,
  canopy,
  amazonScrapingFallback,
];

export const SOCIAL_CHANNELS: SocialChannelClient[] = [postiz, ayrshare, tiktok, metaAds];

export function findDataSource(id: string): DataSourceClient | undefined {
  return DATA_SOURCES.find((s) => s.id === id);
}
export function findSocialChannel(id: string): SocialChannelClient | undefined {
  return SOCIAL_CHANNELS.find((s) => s.id === id);
}

interface IntegrationRow {
  id: string;
  category: 'data_source' | 'social_channel' | 'orchestration';
  enabled: boolean;
  config: Record<string, unknown>;
  last_synced_at: string | null;
  last_status: 'ok' | 'error' | 'never_run';
  last_error: string | null;
}

export async function getIntegrationRow(id: string): Promise<IntegrationRow | null> {
  const { data } = await getSupabaseAdmin().from('integrations').select('*').eq('id', id).single();
  return (data as IntegrationRow) ?? null;
}

export async function getIntegrationConfig(id: string): Promise<Record<string, unknown> | null> {
  const row = await getIntegrationRow(id);
  return row?.config ?? null;
}

export async function isIntegrationEnabled(id: string): Promise<boolean> {
  const row = await getIntegrationRow(id);
  return Boolean(row?.enabled);
}

export async function setIntegrationEnabled(id: string, enabled: boolean): Promise<void> {
  await getSupabaseAdmin().from('integrations').update({ enabled }).eq('id', id);
}

export async function recordSyncResult(id: string, status: 'ok' | 'error', error?: string): Promise<void> {
  await getSupabaseAdmin()
    .from('integrations')
    .update({ last_synced_at: new Date().toISOString(), last_status: status, last_error: error ?? null })
    .eq('id', id);
}

/** Vue combinée (statut DB + statut code) pour l'écran /admin/settings/integrations. */
export async function listIntegrationsWithStatus() {
  const { data: rows } = await getSupabaseAdmin().from('integrations').select('*');
  const rowById = new Map((rows ?? []).map((r: any) => [r.id, r]));

  const dataSourceEntries = DATA_SOURCES.map((client) => {
    const row = rowById.get(client.id);
    return {
      id: client.id,
      displayName: client.displayName,
      category: 'data_source' as const,
      configured: client.isConfigured(),
      enabled: Boolean(row?.enabled),
      lastSyncedAt: row?.last_synced_at ?? null,
      lastStatus: row?.last_status ?? 'never_run',
      lastError: row?.last_error ?? null,
    };
  });

  const socialChannelEntries = SOCIAL_CHANNELS.map((client) => {
    const row = rowById.get(client.id);
    return {
      id: client.id,
      displayName: client.displayName,
      category: 'social_channel' as const,
      configured: client.isConfigured(),
      enabled: Boolean(row?.enabled),
      lastSyncedAt: row?.last_synced_at ?? null,
      lastStatus: row?.last_status ?? 'never_run',
      lastError: row?.last_error ?? null,
    };
  });

  return { dataSources: dataSourceEntries, socialChannels: socialChannelEntries };
}
