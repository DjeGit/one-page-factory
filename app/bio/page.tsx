import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getMarketCatalog } from '@/lib/site-products';
import { SITE_COPY } from '@/lib/site-copy';
import { getRequestMarket } from '@/lib/site-url';
import { getCardPrice } from '@/lib/pricing';
import { productCoverUrl, resolveImage } from '@/lib/site-image';

export const dynamic = 'force-dynamic';

// Page « lien en bio » (Instagram, TikTok) : jamais indexée. Titre dans la
// langue du domaine (avant : toujours en français).
export async function generateMetadata(): Promise<Metadata> {
  const t = SITE_COPY[getRequestMarket(headers())].bio;
  return { title: t.title, robots: { index: false, follow: false } };
}

// Survol géré en CSS : cette page est un composant serveur, elle ne peut pas
// recevoir de gestionnaires onMouseEnter/onMouseLeave (ils faisaient planter la
// page dès qu'un produit était en ligne).
const BIO_CSS = `
.bio-link{display:flex;align-items:center;gap:16px;background:rgba(255,255,255,0.08);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:14px 18px;text-decoration:none;color:#fff;transition:all .18s ease}
.bio-link:hover,.bio-link:focus-visible{background:rgba(124,58,237,0.25);border-color:rgba(124,58,237,0.5);transform:translateY(-2px);box-shadow:0 8px 32px rgba(124,58,237,0.2)}
`;

export default async function BioPage() {
  // Marché lu sur le domaine (x-forwarded-host d'abord) : disponible dès la
  // toute première requête, contrairement à un cookie (audit 21/09).
  const market = getRequestMarket(headers());
  const t = SITE_COPY[market];
  const copy = t.bio;
  const active = await getMarketCatalog(market);

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
      <style>{BIO_CSS}</style>
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
          {copy.title}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            margin: 0,
          }}
        >
          {copy.productCount(active.length)}
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
            {copy.noProduct}
          </div>
        ) : (
          active.map((product) => (
            <a
              key={product.id}
              href={`/${product.slug}`}
              className="bio-link"
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
                {resolveImage(productCoverUrl(product, 96)) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={productCoverUrl(product, 96) as string}
                    alt={product.name}
                    width={48}
                    height={48}
                    loading="lazy"
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
                {(() => {
                  const price = getCardPrice(product, t.product.locale, market);
                  return price || product.free_shipping ? (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                      {price && <span style={{ color: '#F59E0B', fontWeight: 700 }}>{price}</span>}
                      {price && product.free_shipping ? ' · ' : ''}
                      {product.free_shipping ? t.common.freeShipping : ''}
                    </div>
                  ) : null;
                })()}
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
        {copy.affiliateFooter} © {new Date().getFullYear()}
      </p>
    </main>
  );
}
