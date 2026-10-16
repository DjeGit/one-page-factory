import { ImageResponse } from 'next/og';

// Image de partage par défaut (audit E2) : un lien Tendpick collé dans
// WhatsApp, Facebook ou X s'affichait sans visuel. Les pages produit
// fournissent leur propre image ; celle-ci sert à toutes les autres
// (accueil, catalogue, catégories, blog). Générée à la volée, pas de
// fichier binaire à maintenir dans le dépôt.
export const alt = 'Tendpick';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F9FC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', position: 'relative', width: 260, height: 170 }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 170,
                height: 170,
                borderRadius: 170,
                background: '#1B2A4A',
                opacity: 0.94,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 90,
                top: 0,
                width: 170,
                height: 170,
                borderRadius: 170,
                background: '#FF6B35',
                opacity: 0.94,
              }}
            />
          </div>
          <div style={{ marginLeft: 48, fontSize: 150, fontWeight: 800, color: '#1B2A4A', letterSpacing: -4 }}>
            Tendpick
          </div>
        </div>
      </div>
    ),
    size
  );
}
