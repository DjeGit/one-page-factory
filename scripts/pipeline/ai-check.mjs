// Vérifie en 10 secondes que la clé Anthropic fonctionne et que les deux modèles répondent (coût : moins d'un centime).
// Lancer : node --env-file=.env.local scripts/pipeline/ai-check.mjs
import { DEFAULT_CLAUDE_TEXT_MODEL, textProvider } from './fiche-text.mjs';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('✗ ANTHROPIC_API_KEY absente de .env.local');
  process.exit(1);
}
console.log(`Fournisseur des textes : ${textProvider()}`);
const models = [
  ['Textes (Sonnet)', process.env.ANTHROPIC_TEXT_MODEL || DEFAULT_CLAUDE_TEXT_MODEL],
  ['Photos (Haiku)', process.env.ANTHROPIC_VISION_MODEL || 'claude-haiku-5-5'],
];
let bad = 0;
for (const [label, model] of models) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 20, messages: [{ role: 'user', content: 'Réponds seulement : ok' }] }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} : ${data?.error?.message || 'erreur'}`);
    console.log(`✓ ${label} — ${model} répond (${data.usage?.input_tokens ?? '?'} → ${data.usage?.output_tokens ?? '?'} tokens)`);
  } catch (e) {
    bad++;
    console.log(`✗ ${label} — ${model} : ${e.message}`);
  }
}
process.exit(bad ? 1 : 0);
