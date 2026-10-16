/**
 * Sérialisation JSON-LD sûre pour <script type="application/ld+json"> —
 * audit E5 : JSON.stringify seul laisse passer "</script>" (ou "<!--")
 * dans un titre ou une description, ce qui fermerait la balise et
 * permettrait d'injecter du HTML. On échappe "<" (et les séparateurs de
 * ligne Unicode) : le JSON reste valide et identique une fois parsé.
 */
const LS = new RegExp(String.fromCharCode(0x2028), 'g');
const PS = new RegExp(String.fromCharCode(0x2029), 'g');

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(LS, '\\u2028')
    .replace(PS, '\\u2029');
}
