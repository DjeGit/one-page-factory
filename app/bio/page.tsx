import { getAllProducts } from '@/lib/supabase';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nos produits',
  description: 'Découvrez tous nos produits sélectionnés.',
  robots: { index: false },
};

export default async function BioPage() {
  const allProducts = await getAllProducts();
  const active = allProducts.filter((p) => p.active);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 16px 64px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #F59E0B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
          }}
        >
          ⚡
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#ffffff',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
          }}
        >
          Nos sélections
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            margin: 0,
          }}
        >
          {active.length} produit{active.length !== 1 ? 's' : ''} soigneusement sélectionnés
        </p>
      </div>

      {/* Product links */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {active.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '32px 24px',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 14,
            }}
          >
            Aucun produit disponible pour le moment.
          </div>
        ) : (
          active.map((product) => (
            <a
              key={product.id}
              href={`${siteUrl}/${product.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 16,
                padding: '14px 18px',
                textDecoration: 'none',
                color: '#ffffff',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(124,58,237,0.25)';
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Image or placeholder */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'rgba(124,58,237,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  '🛒'
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {product.name}
                </div>
                {product.price && (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.55)',
                      marginTop: 2,
                    }}
                  >
                    {product.original_price && product.original_price > product.price && (
                      <span
                        style={{
                          textDecoration: 'line-through',
                          marginRight: 6,
                          color: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {product.original_price.toFixed(2)}€
                      </span>
                    )}
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>
                      {product.price.toFixed(2)}€
                    </span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <svg
                style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))
        )}
      </div>

      {/* Footer */}
      <p
        style={{
          marginTop: 48,
          fontSize: 11,
          color: 'rgba(255,255,255,0.2)',
          textAlign: 'center',
        }}
      >
        Liens d&apos;affiliation · © {new Date().getFullYear()}
      </p>
    </main>
  );
}
