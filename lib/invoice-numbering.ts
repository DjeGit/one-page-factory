import type { SupabaseClient } from '@supabase/supabase-js';
import type { Market } from '@/lib/market';
import type { InvoiceType } from '@/types';

/**
 * Attribue un numéro de facture/avoir séquentiel — une suite par (marché,
 * année, type de document), jamais réutilisée. N'appeler qu'à la
 * finalisation d'un document (passage 'draft' → 'sent'), jamais à la
 * création d'un brouillon : un brouillon supprimé ne doit pas laisser de
 * trou dans la séquence (obligation légale française de numérotation
 * continue, art. 289 CGI).
 *
 * L'incrément est atomique côté base (fonction SQL next_invoice_number,
 * voir supabase/migrations/20260918000007_invoices.sql) — un simple
 * lecture-puis-écriture côté application risquerait une collision entre
 * deux finalisations concurrentes.
 */
/**
 * Année civile utilisée pour la numérotation — calculée dans le fuseau
 * Europe/Paris plutôt que l'UTC serveur (audit 21/09, edge case LOW).
 * Concerne uniquement les quelques heures autour du 31/12→01/01 : une
 * facture finalisée à 00h30 heure de Paris le 1er janvier calculait avant
 * l'année via `new Date().getFullYear()` en UTC, encore 31/12 à cette
 * heure-là — mauvaise année. Le fuseau Europe/Paris est un choix
 * raisonnable (l'entreprise opère depuis la France/l'Espagne, toutes deux
 * en CET/CEST) mais reste approximatif pour le marché 'uk', qui désigne
 * une cible langue anglophone sans fuseau propre (cf. lib/market.ts) — pas
 * de fuseau "correct" unique pour ce marché, tranché ici plutôt que de
 * laisser le bug UTC d'origine.
 */
function currentInvoiceYear(): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric' }).format(new Date()));
}

export async function generateInvoiceNumber(
  sb: SupabaseClient,
  market: Market,
  docType: InvoiceType,
  year: number = currentInvoiceYear()
): Promise<string> {
  const { data, error } = await sb.rpc('next_invoice_number', {
    p_market: market,
    p_year: year,
    p_doc_type: docType,
  });
  if (error || data == null) {
    throw new Error(error?.message || 'Échec de génération du numéro de facture');
  }
  const formatted = String(data).padStart(6, '0');
  return `${market.toUpperCase()}-${year}-${formatted}`;
}
