/**
 * Test A/B : compteurs de vues et de clics par variante.
 *
 * Les compteurs sont des entiers lus puis réécrits ; deux visiteurs simultanés
 * pouvaient donc s'écraser (un des deux comptages se perdait). L'écriture est
 * maintenant « conditionnelle » (compare-and-set) : elle n'aboutit que si la
 * valeur n'a pas bougé entre la lecture et l'écriture, sinon on relit et on
 * réessaie (5 fois au plus).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type AbVariant = 'a' | 'b';
export type AbEvent = 'views' | 'clicks';

export function isAbVariant(v: unknown): v is AbVariant {
  return v === 'a' || v === 'b';
}

export async function incrementAbCounter(
  sb: SupabaseClient,
  testId: string,
  variant: AbVariant,
  event: AbEvent,
): Promise<'ok' | 'not_found' | 'error'> {
  const field = `variant_${variant}_${event}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb.from('ab_tests').select(field).eq('id', testId).maybeSingle();
    if (error) return 'error';
    if (!data) return 'not_found';
    const current = Number((data as unknown as Record<string, unknown>)[field]) || 0;
    const { data: updated, error: updError } = await sb
      .from('ab_tests')
      .update({ [field]: current + 1 })
      .eq('id', testId)
      .eq(field, current)
      .select('id');
    if (updError) return 'error';
    if (updated && updated.length > 0) return 'ok';
  }
  return 'error';
}

/**
 * Compte un clic pour la variante que ce visiteur a vue (cookie `ab_<id du test>` posé par
 * la page produit). Sans test actif sur le produit ou sans cookie : ne fait rien. Ne lève
 * jamais d'erreur : le test A/B ne doit pas empêcher la redirection d'achat.
 */
export async function trackAbClick(
  sb: SupabaseClient,
  productId: string,
  readCookie: (name: string) => string | undefined,
): Promise<void> {
  try {
    const { data: test } = await sb
      .from('ab_tests')
      .select('id')
      .eq('product_id', productId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!test) return;
    const variant = readCookie(`ab_${test.id}`);
    if (isAbVariant(variant)) await incrementAbCounter(sb, test.id, variant, 'clicks');
  } catch (err) {
    console.error('[api] clic A/B non compté :', err);
  }
}
