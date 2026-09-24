import React from 'react';
import type { Product } from '@/types';
import type { TemplateConfig } from '@/lib/templates';

export interface TemplateOverrides {
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  sections: {
    painPoints: boolean;
    benefits: boolean;
    testimonials: boolean;
    faq: boolean;
    countdown: boolean;
    stock: boolean;
  };
}

interface Props {
  product: Product;
  template: TemplateConfig;
  overrides?: TemplateOverrides;
  scale?: number;
  ctaHref?: string;
}

// Helper to build gradient style from template
function buildGradientStyle(template: TemplateConfig): React.CSSProperties {
  // Map tailwind gradient class names to actual colors
  const colorMap: Record<string, string> = {
    'from-gray-950': '#030712',
    'to-violet-950': '#2e1065',
    'from-white': '#ffffff',
    'to-gray-50': '#f9fafb',
    'from-red-950': '#450a0a',
    'to-orange-900': '#431407',
    'from-emerald-950': '#022c22',
    'to-green-900': '#14532d',
    'from-blue-950': '#172554',
    'to-cyan-900': '#164e63',
    'from-stone-950': '#0c0a09',
    'to-amber-950': '#451a03',
    'from-purple-50': '#faf5ff',
    'to-pink-50': '#fdf2f8',
    'from-gray-950-slate': '#030712',
    'to-slate-900': '#0f172a',
    'from-amber-400': '#fbbf24',
    'to-orange-500': '#f97316',
    'from-blue-50': '#eff6ff',
    'to-blue-50': '#eff6ff',
  };

  const fromColor = colorMap[template.bgFrom] || '#111827';
  const toColor = colorMap[template.bgTo] || '#1f2937';

  return {
    background: `linear-gradient(135deg, ${fromColor} 0%, ${toColor} 100%)`,
    minHeight: '100%',
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#F59E0B', fontSize: '14px' }}>
      {'★'.repeat(Math.min(rating, 5))}{'☆'.repeat(Math.max(0, 5 - rating))}
    </span>
  );
}

export default function TemplateRenderer({ product, template, overrides, scale, ctaHref }: Props) {
  const isDark = template.textColor === 'white';
  const textBase = isDark ? '#ffffff' : '#111827';
  const textMuted = isDark ? 'rgba(255,255,255,0.7)' : '#6b7280';
  const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  const heroTitle = overrides?.heroTitle || product.hero_title || product.name;
  const heroSubtitle = overrides?.heroSubtitle || product.hero_subtitle || product.description || 'Découvrez ce produit exceptionnel';
  const ctaText = overrides?.ctaText || 'Acheter maintenant';

  const sections = overrides?.sections || {
    painPoints: true,
    benefits: true,
    testimonials: true,
    faq: true,
    countdown: template.defaultSections.countdown,
    stock: template.defaultSections.stock,
  };

  const gradientStyle = buildGradientStyle(template);

  const formatPrice = (price: number | null) => {
    if (!price) return '';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  const ctaButtonStyle: React.CSSProperties = {
    backgroundColor: template.accentColor,
    color: '#ffffff',
    padding: '14px 32px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-block',
    textDecoration: 'none',
    letterSpacing: '0.025em',
  };
  const CtaBtn = ({ extraStyle }: { extraStyle?: React.CSSProperties }) => {
    const s: React.CSSProperties = extraStyle ? { ...ctaButtonStyle, ...extraStyle } : ctaButtonStyle;
    if (ctaHref) return <a href={ctaHref} style={s} target="_blank" rel="noopener noreferrer">{ctaText} →</a>;
    return <span style={s}>{ctaText} →</span>;
  };


  // Hero section content
  const HeroContent = () => (
    <div style={{ flex: 1 }}>
      {/* Badge */}
      <div style={{
        display: 'inline-block',
        backgroundColor: template.accentColor,
        color: '#fff',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 700,
        marginBottom: '16px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        ⭐ Produit recommandé
      </div>

      <h1 style={{
        fontSize: '2.2rem',
        fontWeight: 900,
        color: textBase,
        lineHeight: 1.15,
        marginBottom: '16px',
      }}>
        {heroTitle}
      </h1>

      <p style={{
        fontSize: '1.1rem',
        color: textMuted,
        lineHeight: 1.6,
        marginBottom: '24px',
      }}>
        {heroSubtitle}
      </p>

      {/* Price */}
      {product.price && (
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: template.accentColor }}>
            {formatPrice(product.price)}
          </span>
          {product.original_price && product.original_price > product.price && (
            <span style={{ fontSize: '1.2rem', textDecoration: 'line-through', color: textMuted }}>
              {formatPrice(product.original_price)}
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <div style={{ marginBottom: '24px' }}>
        <CtaBtn />
      </div>

      {/* Trust badges */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {['✓ Livraison rapide', '✓ Satisfait ou remboursé', '✓ Paiement sécurisé'].map((badge) => (
          <span key={badge} style={{ fontSize: '12px', color: textMuted, fontWeight: 600 }}>{badge}</span>
        ))}
      </div>
    </div>
  );

  const HeroImage = () => (
    <div
      className="tp-hero-image"
      style={{
        flex: '0 0 auto',
        width: template.heroLayout === 'centered' ? '280px' : '340px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image_url}
          alt={product.name}
          style={{
            maxWidth: '100%',
            maxHeight: '340px',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.15)',
          }}
        />
      ) : (
        <div style={{
          width: '280px',
          height: '280px',
          borderRadius: '12px',
          backgroundColor: cardBg,
          border: `2px dashed ${cardBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
        }}>
          📦
        </div>
      )}
    </div>
  );

  const renderHero = () => {
    const heroStyle: React.CSSProperties = {
      padding: '60px 48px',
      ...gradientStyle,
    };

    if (template.heroLayout === 'centered') {
      return (
        <section style={heroStyle} className="tp-hero-section">
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-block',
              backgroundColor: template.accentColor,
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              ⭐ Produit recommandé
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: textBase,
              lineHeight: 1.15,
              marginBottom: '16px',
            }}>
              {heroTitle}
            </h1>
            <p style={{
              fontSize: '1.1rem',
              color: textMuted,
              lineHeight: 1.6,
              marginBottom: '32px',
              maxWidth: '600px',
              margin: '0 auto 32px',
            }}>
              {heroSubtitle}
            </p>
            <HeroImage />
            <div style={{ marginTop: '32px' }}>
              {product.price && (
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: template.accentColor }}>
                    {formatPrice(product.price)}
                  </span>
                  {product.original_price && product.original_price > product.price && (
                    <span style={{ fontSize: '1.2rem', textDecoration: 'line-through', color: textMuted }}>
                      {formatPrice(product.original_price)}
                    </span>
                  )}
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <CtaBtn />
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {['✓ Livraison rapide', '✓ Satisfait ou remboursé', '✓ Paiement sécurisé'].map((badge) => (
                  <span key={badge} style={{ fontSize: '12px', color: textMuted, fontWeight: 600 }}>{badge}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (template.heroLayout === 'split-left') {
      return (
        <section style={heroStyle} className="tp-hero-section">
          <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '48px' }} className="tp-hero-split">
            <HeroContent />
            <HeroImage />
          </div>
        </section>
      );
    }

    // split-right
    return (
      <section style={heroStyle} className="tp-hero-section">
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '48px' }} className="tp-hero-split">
          <HeroImage />
          <HeroContent />
        </div>
      </section>
    );
  };

  const sectionStyle: React.CSSProperties = {
    padding: '48px',
    borderTop: `1px solid ${dividerColor}`,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: textBase,
    marginBottom: '32px',
    textAlign: 'center',
  };

  const content = (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', ...gradientStyle }}>
      {/* Styles responsive (22/09) : ce composant est entièrement en styles
          inline (pas de classes Tailwind) — une media query classique est
          donc le seul moyen de faire varier une valeur selon la largeur
          d'écran ici. `!important` nécessaire pour prendre le dessus sur
          les styles inline qui fixaient les mêmes propriétés (largeur de
          l'image hero, direction du hero split) — avant ce correctif, le
          hero en disposition split-left/split-right ne repassait jamais en
          colonne sur mobile et l'image gardait sa largeur fixe (280-340px),
          provoquant un débordement horizontal sur petit écran. */}
      <style>{`
        @media (max-width: 640px) {
          .tp-hero-split { flex-direction: column !important; text-align: center; }
          .tp-hero-image { width: 100% !important; }
          .tp-hero-image img, .tp-hero-image > div { max-width: 220px !important; margin: 0 auto; }
          .tp-hero-section { padding: 40px 20px !important; }
          .tp-section { padding: 32px 20px !important; }
        }
      `}</style>

      {/* HERO */}
      {renderHero()}

      {/* COUNTDOWN et STOCK retirés (22/09) : valeurs 100% fictives et figées
          ("02:34:21", "7 unités") sans aucune donnée réelle derrière — même
          risque de pratique commerciale trompeuse déjà écarté sur le
          parcours legacy (cf. app/[slug]/page.tsx). sections.countdown /
          sections.stock restent dans le type le temps de nettoyer les
          template_config existants, mais ne sont plus lus ici. */}

      {/* PAIN POINTS */}
      {sections.painPoints && product.pain_points && product.pain_points.length > 0 && (
        <section style={sectionStyle} className="tp-section">
          <h2 style={sectionTitleStyle}>Vous en avez assez de... ?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
            {product.pain_points.slice(0, 3).map((point, i) => (
              <div key={i} style={{
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                padding: '24px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>{point.emoji}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: textBase, marginBottom: '8px' }}>{point.title}</h3>
                <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.5 }}>{point.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* BENEFITS */}
      {sections.benefits && product.benefits && product.benefits.length > 0 && (
        <section style={sectionStyle} className="tp-section">
          <h2 style={sectionTitleStyle}>Pourquoi choisir ce produit ?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {product.benefits.map((benefit, i) => (
              <div key={i} style={{
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{benefit.icon}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: textBase, marginBottom: '8px' }}>{benefit.title}</h3>
                <p style={{ fontSize: '13px', color: textMuted, lineHeight: 1.5 }}>{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {sections.testimonials && product.testimonials && product.testimonials.length > 0 && (
        <section style={sectionStyle} className="tp-section">
          <h2 style={sectionTitleStyle}>Ce que disent nos clients</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {product.testimonials.slice(0, 3).map((testimonial, i) => (
              <div key={i} style={{
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                padding: '24px',
              }}>
                <StarRating rating={testimonial.rating} />
                <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.6, margin: '12px 0', fontStyle: 'italic' }}>
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: template.primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}>
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: textBase }}>{testimonial.name}</div>
                    <div style={{ fontSize: '11px', color: textMuted }}>{testimonial.location} · {testimonial.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {sections.faq && product.faq && product.faq.length > 0 && (
        <section style={sectionStyle} className="tp-section">
          <h2 style={sectionTitleStyle}>Questions fréquentes</h2>
          <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {product.faq.map((item, i) => (
              <div key={i} style={{
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '12px',
                padding: '20px 24px',
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: textBase, marginBottom: '8px' }}>{item.question}</h3>
                <p style={{ fontSize: '14px', color: textMuted, lineHeight: 1.6 }}>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="tp-section" style={{ padding: '48px', textAlign: 'center', borderTop: `1px solid ${dividerColor}` }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: textBase, marginBottom: '16px' }}>
          Prêt à transformer votre vie ?
        </h2>
        <p style={{ color: textMuted, marginBottom: '24px', fontSize: '16px' }}>
          Rejoignez des milliers de clients satisfaits
        </p>
        <CtaBtn extraStyle={{ padding: '16px 48px', fontSize: '18px' }} />
      </section>
    </div>
  );

  if (scale && scale !== 1) {
    return (
      <div style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
        pointerEvents: 'none',
      }}>
        {content}
      </div>
    );
  }

  return content;
}
