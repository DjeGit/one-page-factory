import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { getProduct, getSupabaseAdmin } from '@/lib/supabase';
import HeroSection from '@/components/landing/HeroSection';
import PainPoints from '@/components/landing/PainPoints';
import Benefits from '@/components/landing/Benefits';
import ProductShowcase from '@/components/landing/ProductShowcase';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import CTAButton from '@/components/landing/CTAButton';
import StickyBuy from '@/components/landing/StickyBuy';
import PixelInjector from '@/components/landing/PixelInjector';
import SocialProofNotification from '@/components/landing/SocialProofNotification';
import ExitIntentPopup from '@/components/landing/ExitIntentPopup';
import EmailCapturePopup from '@/components/landing/EmailCapturePopup';
import ProductStructuredData from '@/components/landing/ProductStructuredData';
import LandingHeader from '@/components/layout/LandingHeader';
import AffiliateDisclosureBanner from '@/components/landing/AffiliateDisclosureBanner';
import LandingFooter from '@/components/layout/LandingFooter';
import CookieConsent from '@/components/layout/CookieConsent';
import TemplateRenderer from '@/components/templates/TemplateRenderer';
import type { TemplateOverrides } from '@/components/templates/TemplateRenderer';
import { getTemplate } from '@/lib/templates';
import { isValidMarket, DEFAULT_MARKET } from '@/lib/market';
import type { ABTest } from '@/types';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: 'Produit introuvable' };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: product.meta_title || product.name,
    description: product.meta_description || product.description || undefined,
    openGraph: {
      title: product.meta_title || product.name,
      description: product.meta_description || product.description || undefined,
      images: product.image_url ? [product.image_url] : [],
      // og:type=product est un type OpenGraph standard (namespace produit
      // Facebook/e-commerce) mais absent de l'union TypeScript de Next.js —
      // cast local nécessaire, la valeur réelle envoyée reste bien 'product'.
      url: `${siteUrl}/${product.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: product.meta_title || product.name,
      description: product.meta_description || product.description || undefined,
      images: product.image_url ? [product.image_url] : [],
    },
    alternates: {
      canonical: `${siteUrl}/${product.slug}`,
    },
  };
}

// Track page view server-side
async function trackServerPageView(productId: string) {
  try {
    const headersList = headers();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || null;
    const referer = headersList.get('referer') || null;

    // Call analytics API internally
    await fetch(`${siteUrl}/api/analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ productId, type: 'view' }),
      cache: 'no-store',
    });
  } catch {
    // Silently fail
  }
}

// Fetch active A/B test for a product (server-side)
async function getActiveABTest(productId: string): Promise<ABTest | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('ab_tests')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .is('winner', null)
      .single();

    if (error || !data) return null;
    return data as ABTest;
  } catch {
    return null;
  }
}

export default async function LandingPage({ params }: Props) {
  const product = await getProduct(params.slug);

  if (!product) {
    notFound();
  }

  // Marché de la PAGE (produit), pas celui du visiteur — la disclosure et
  // le consentement doivent refléter le contenu affiché, cf. plan Sprint 1.
  const market = isValidMarket(product.market) ? product.market : DEFAULT_MARKET;

  // Track page view (non-blocking)
  trackServerPageView(product.id);

  // Market i18n for static CTA copy (marché = langue, cf. lib/market.ts — 'uk' == anglophone).
  // Audit 21/09 (bug HIGH corrigé) : utilisait avant le cookie visiteur
  // opf_market, illisible dans la même requête qui vient de le poser (donc
  // toujours 'fr' par défaut pour un premier visiteur) ET potentiellement
  // porteur d'une valeur invalide ('com' avant correction du middleware,
  // absente de CTA_I18N → plantage au rendu pour les visiteurs récurrents
  // sur le marché anglophone). `market` (product.market, calculé plus haut)
  // est déjà utilisé par AffiliateDisclosureBanner/LandingFooter/CookieConsent
  // pour la même raison — on aligne le CTA sur la même source fiable.
  const CTA_I18N = {
    fr: { ctaTitle: 'Prêt à changer votre quotidien ?', ctaDesc: 'Des milliers de clients ont déjà fait le choix. Ne passez pas à côté.', ctaBtn: 'Je commande maintenant', trust: ['🔒 Paiement sécurisé Amazon', '🚚 Livraison Amazon Prime', '✅ Retours Amazon 30j'] },
    es: { ctaTitle: '¿Listo para cambiar tu vida?', ctaDesc: 'Miles de clientes ya han tomado la decisión. No te lo pierdas.', ctaBtn: 'Pedir ahora', trust: ['🔒 Pago seguro Amazon', '🚚 Envío Amazon Prime', '✅ Devoluciones Amazon 30 días'] },
    uk: { ctaTitle: 'Ready to change your life?', ctaDesc: 'Thousands of customers have already made the choice. Do not miss out.', ctaBtn: 'Order now', trust: ['🔒 Secure Amazon payment', '🚚 Amazon Prime delivery', '✅ Amazon 30-day returns'] },
  } as const;
  const i18n = CTA_I18N[market];

  // Design Studio: TemplateRenderer when template_id is set
  if (product.template_id) {
    const tpl = getTemplate(product.template_id);
    const tplOverrides = product.template_config
      ? (product.template_config as unknown as TemplateOverrides)
      : undefined;
    const ctaHref = product.affiliate_url ?? undefined;
    return (
      <>
        <PixelInjector pixelMeta={product.pixel_meta} pixelTiktok={product.pixel_tiktok} pixelGtm={product.pixel_gtm} />
        <ProductStructuredData product={product} />
        <LandingHeader productName={product.name} />
        <AffiliateDisclosureBanner market={market} />
        <TemplateRenderer
          product={product}
          template={tpl}
          overrides={tplOverrides}
          ctaHref={ctaHref}
        />
        <LandingFooter market={market} />
        <StickyBuy
          redirectCode={product.redirect_code}
          productId={product.id}
          price={product.price}
          productName={product.name}
        />
        <CookieConsent market={market} />
      </>
    );
  }

  // A/B test: fetch active test and randomly pick variant server-side
  const abTest = await getActiveABTest(product.id);
  let abVariant: 'a' | 'b' | null = null;
  let heroTitle: string | null = null;
  let heroSubtitle: string | null = null;
  let heroCta: string | null = null;

  if (abTest) {
    // Persist variant via cookie so user always sees the same variant
    const cookieStore = cookies();
    const existingVariant = cookieStore.get(`ab_${abTest.id}`)?.value as 'a' | 'b' | undefined;
    abVariant = existingVariant || (Math.random() < 0.5 ? 'a' : 'b');
    if (abVariant === 'a') {
      heroTitle = abTest.variant_a_title || null;
      heroSubtitle = abTest.variant_a_subtitle || null;
      heroCta = abTest.variant_a_cta || null;
    } else {
      heroTitle = abTest.variant_b_title || null;
      heroSubtitle = abTest.variant_b_subtitle || null;
      heroCta = abTest.variant_b_cta || null;
    }
  }

  return (
    <>
      {/* Pixel tracking */}
      <PixelInjector
        pixelMeta={product.pixel_meta}
        pixelTiktok={product.pixel_tiktok}
        pixelGtm={product.pixel_gtm}
      />

      {/* Structured data */}
      <ProductStructuredData product={product} />

      {/* Navigation Tendpick */}
      <LandingHeader
        productName={product.name}
        affiliateUrl={product.affiliate_url}
      />

      <AffiliateDisclosureBanner market={market} />

      <main>
        {/* 1. Hero */}
        <HeroSection
          product={product}
          heroTitle={heroTitle}
          heroSubtitle={heroSubtitle}
          heroCta={heroCta}
        />

        {/* 2. Urgency section — retiré : countdown/stock factices sans donnée réelle
             derrière (risque pratique commerciale trompeuse). À réactiver seulement
             une fois branché sur une vraie source de stock/deadline. */}

        {/* 3. Pain Points */}
        <PainPoints painPoints={product.pain_points || []} />

        {/* 4. Benefits */}
        <Benefits benefits={product.benefits || []} productName={product.name} />

        {/* 5. Product Showcase + mid-page CTA */}
        <ProductShowcase product={product} />

        {/* 6. Testimonials */}
        <Testimonials testimonials={product.testimonials || []} />

        {/* 7. Final CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary-950 via-gray-950 to-gray-950">
          <div className="container mx-auto px-4 text-center max-w-xl">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {i18n.ctaTitle}
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              {i18n.ctaDesc}
            </p>

            <CTAButton
              redirectCode={product.redirect_code}
              productId={product.id}
              label={i18n.ctaBtn}
              size="xl"
              className="w-full justify-center"
            />

            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
              {i18n.trust.map((t, k) => <span key={k}>{t}</span>)}
            </div>
          </div>
        </section>

        {/* 8. FAQ */}
        <FAQ items={product.faq || []} />
      </main>

      {/* Footer Tendpick */}
      <LandingFooter market={market} />

      {/* Sticky mobile buy bar */}
      <StickyBuy
        redirectCode={product.redirect_code}
        productId={product.id}
        price={product.price}
        productName={product.name}
      />

      {/* Social proof notification */}
      {product.social_proof_enabled !== false && (
        <SocialProofNotification productName={product.name} />
      )}

      {/* Exit intent popup */}
      {product.exit_intent_enabled !== false && (
        <ExitIntentPopup
          productName={product.name}
          redirectCode={product.redirect_code}
          price={product.price}
        />
      )}

      {/* Email capture popup */}
      {product.email_capture_enabled && (
        <EmailCapturePopup
          productId={product.id}
          productName={product.name}
          slug={product.slug}
          discount={product.email_capture_discount || 10}
        />
      )}

      {/* A/B test variant tracking */}
      {abTest && abVariant && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var testId = ${JSON.stringify(abTest.id)};
                  var variant = ${JSON.stringify(abVariant)};
                  // Persist variant in cookie so user always sees the same variant
                  if (!document.cookie.includes('ab_' + testId + '=')) {
                    document.cookie = 'ab_' + testId + '=' + variant + '; path=/; max-age=2592000; SameSite=Lax';
                  }
                  fetch('/api/analytics', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      type: 'ab_view',
                      testId: testId,
                      variant: variant,
                      productId: ${JSON.stringify(product.id)}
                    })
                  }).catch(function(){});
                } catch(e) {}
              })();
            `,
          }}
        />
      )}

      {/* GDPR Cookie Consent */}
      <CookieConsent market={market} />
    </>
  );
}
