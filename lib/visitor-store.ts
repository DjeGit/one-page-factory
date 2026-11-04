/**
 * Enregistrement d'une page vue par la mesure d'audience maison (voir lib/visitor-tracking.ts et app/api/visit).
 *
 * Avant : lire le visiteur, puis l'insérer ou le mettre à jour (visit_count = ancien + 1), puis insérer la page,
 * soit 3 à 4 requêtes dont deux concurrentes pouvaient s'écraser (deux onglets ouverts en même temps = une visite perdue,
 * ou une erreur « clé en double » à la première visite).
 * Maintenant : UNE fonction SQL atomique (opf_record_visit, migration 20261104000001_analytics_functions.sql).
 * Tant que la migration n'est pas appliquée, on retombe sur l'ancienne séquence.
 *
 * RGPD : comme avant, aucune adresse IP ni user-agent n'est stocké (identifiant aléatoire du cookie `tp_vid` seulement).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { tryRpc } from '@/lib/analytics/stats';

export interface VisitInput {
  visitorId: string;
  market: string;
  sessionId: string;
  path: string;
  pageType: string;
  /** Domaine d'origine, déjà décidé par l'appelant (null hors début de visite). */
  referrerHost: string | null;
  newSession: boolean;
}

/** Enregistre la page vue et renvoie l'identifiant de la ligne page_visits. Lève une erreur en cas d'échec. */
export async function recordVisit(sb: Pick<SupabaseClient, 'rpc' | 'from'>, v: VisitInput): Promise<string> {
  const viaRpc = await tryRpc<string | null>(sb, 'opf_record_visit', {
    p_visitor_id: v.visitorId,
    p_market: v.market,
    p_session_id: v.sessionId,
    p_path: v.path,
    p_page_type: v.pageType,
    p_referrer_host: v.referrerHost,
    p_new_session: v.newSession,
  });
  if (viaRpc.ok && typeof viaRpc.data === 'string') return viaRpc.data;
  if (viaRpc.ok) throw new Error('opf_record_visit n\'a renvoyé aucun identifiant');
  return recordVisitLegacy(sb, v);
}

async function recordVisitLegacy(sb: Pick<SupabaseClient, 'from'>, v: VisitInput): Promise<string> {
  const { data: known, error: readError } = await sb
    .from('visitors')
    .select('visit_count')
    .eq('visitor_id', v.visitorId)
    .maybeSingle();
  if (readError) throw readError;

  if (!known) {
    const { error } = await sb.from('visitors').insert({ visitor_id: v.visitorId, market: v.market });
    // 23505 = deux requêtes simultanées ont créé le visiteur : l'autre a gagné, ce n'est pas une panne.
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await sb
      .from('visitors')
      .update({
        last_seen: new Date().toISOString(),
        visit_count: Number(known.visit_count) + (v.newSession ? 1 : 0),
      })
      .eq('visitor_id', v.visitorId);
    if (error) throw error;
  }

  const { data: inserted, error } = await sb
    .from('page_visits')
    .insert({
      visitor_id: v.visitorId,
      session_id: v.sessionId,
      market: v.market,
      path: v.path,
      page_type: v.pageType,
      referrer_host: v.referrerHost,
    })
    .select('id')
    .single();
  if (error || !inserted) throw error ?? new Error('insert page_visits');
  return inserted.id as string;
}
