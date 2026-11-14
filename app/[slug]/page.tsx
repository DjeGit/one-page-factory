import { Metadata } from 'next';
import { categoryPath } from '@/lib/category-slugs';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers, cookies } from 'next/headers';
import { Check, Lock, Truck } from 'lucide-react';
import { getProduct, getSupabaseAdmin } from '@/lib/supabase';
import { getMarketCatalog, getNavCategories, isPlausibleSlug } from '@/lib/site-products';
import { requestCache } from '@/lib/site-request-cache';
import { ttlCache } from '@/lib/ttl-cache';
import { toMetaDescription } from '@/lib/seo-text';
import ProductCard from '@/components/site/ProductCard';
import PixelInjector from '@/components/landing/PixelInjector';
import ExitIntentPopup from '@/components/landing/ExitIntentPopup';
import EmailCapturePopup from '@/components/landing/EmailCapturePopup';
import ProductStructuredData from '@/components/landing/ProductStructuredData';
import AffiliateDisclosureBanner from '@/components/landing/AffiliateDisclosureBanner';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductGallery from '@/components/product/ProductGallery';
import ProductCTA from '@/components/product/ProductCTA';
import ProductVideo from '@/components/product/ProductVideo';
import { getYouTubeId } from '@/lib/video';
import MobileBuyBar from '@/components/product/MobileBuyBar';
import { getCloudinaryUrl } from '@/lib/cloudinary';
import { getProductGallery } from '@/lib/product-images';
import { TOP_VENTES_SOURCES, getProductSource } from '@/lib/top-ventes';
import { isBotUserAgent } from '@/lib/bot-detection';
import { getRequestMarket, marketUrl } from '@/lib/site-url';
import { redirectToMarketDomain } from '@/lib/market-redirect';
import { SITE_COPY } from '@/lib/site-copy';
import { isValidMarket, DEFAULT_MARKET, getMarketLabel } from '@/lib/market';
import type { Market } from '@/lib/market';
import type { ABTest, Category, Product } from '@/types';
import { getDisplayPrice } from '@/lib/pricing';
import FreeShippingBadge from '@/components/product/FreeShippingBadge';

interface Props {
  params: { slug: string };
}

// generateMetadata et la page lisaient chacune le produit (2 requêtes par
// visite) : mémoïsé le temps d'une requête.
const loadProduct = requestCache((slug: string) => (isPlausibleSlug(slug) ? getProduct(slug) : Promise.resolve(null)));

const OG_LOCALE: Record<Market, string> = { fr: 'fr_FR', es: 'es_ES', uk: 'en_GB' };
const NOT_FOUND_TITLE: Record<Market, string> = { fr: 'Produit introuvable', es: 'Producto no encontrado', uk: 'Product not found' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await loadProduct(params.slug);
  if (!product) {
    // Titre dans la langue du domaine visité (avant : toujours en français).
    let market: Market = DEFAULT_MARKET;
    try {
      market = getRequestMarket(headers());
    } catch {
      // hors requête (aperçu, test) : français par défaut
    }
    return { title: NOT_FOUND_TITLE[market], robots: { index: false, follow: false } };
  }

  // Audit C1 : l'URL de référence est le domaine du MARCHÉ du produit, pas
  // une variable d'environnement unique (qui faisait pointer le canonical de
  // tendpick.fr vers tendpick.com). Pas d'hreflang ici : une fiche n'existe
  // que sur le domaine de son marché.
  const productMarket: Market = isValidMarket(product.market) ? product.market : DEFAULT_MARKET;
  const pageUrl = marketUrl(productMarket, `/${product.slug}`);
  // Image de partage : 1re photo de la galerie, en URL absolue (un simple
  // public ID Cloudinary n'est pas une URL exploitable par Facebook/X).
  const cover = getProductGallery(product)[0];
  const ogImage = cover
    ? getCloudinaryUrl(cover, { width: 1200, height: 630, crop: 'fill', format: 'auto', quality: 'auto' })
    : null;
  const title = product.meta_title || product.name;
  // Description de repli coupée à ~160 caractères (le texte complet du produit
  // fait plusieurs paragraphes). Sans photo, on laisse l'image de partage par
  // défaut du site (app/opengraph-image.tsx) au lieu d'un tableau vide qui la masquait.
  const description = toMetaDescription(product.meta_description || product.description);

  return {
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: 'Tendpick',
      locale: OG_LOCALE[productMarket],
      title,
      description,
      // La clé `images` est OMISE (et non mise à undefined/[]) quand il n'y a pas
      // de photo : Next n'applique l'image de partage par défaut du site
      // (app/opengraph-image.tsx) que si la clé est absente.
      ...(ogImage ? { images: [ogImage] } : {}),
      url: pageUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    alternates: {
      canonical: pageUrl,
    },
  };
}

// Track page view server-side
async function trackServerPageView(productId: string) {
  try {
    const headersList = headers();
    // Audit E9 : ne pas compter (ni attendre) les vues des robots d'indexation
    // et d'aperçu de lien — elles gonflaient les statistiques et ajoutaient
    // un appel HTTP interne à chaque exploration.
    if (isBotUserAgent(headersList.get('user-agent'))) return;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

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

// Test A/B actif d'un produit (serveur). Mis en cache 60 s : la grande majorité
// des fiches n'ont aucun test, ce n'est pas la peine de questionner la base à
// chaque visite pour le savoir.
async function getActiveABTest(productId: string): Promise<ABTest | null> {
  return ttlCache(`abtest:${productId}`, 60_000, () => fetchActiveABTest(productId), () => false);
}

async function fetchActiveABTest(productId: string): Promise<ABTest | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from('ab_tests')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .is('winner', null)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as ABTest;
  } catch {
    return null;
  }
}

// "Vous aimerez aussi" : d'abord la même catégorie, complété par les plus
// récents du même marché (4 cartes). Calculé à partir du catalogue en cache
// (lib/site-products.ts) : aucune requête supplémentaire.
async function getRelatedProducts(product: Product, market: Market): Promise<Product[]> {
  const others = (await getMarketCatalog(market)).filter((p) => p.id !== product.id);
  const sameCategory = product.category_id ? others.filter((p) => p.category_id === product.category_id) : [];
  const rest = others.filter((p) => !sameCategory.includes(p));
  return [...sameCategory, ...rest].slice(0, 4);
}

function categoryName(c: Category, market: Market): string {
  if (market === 'es') return c.name_es;
  if (market === 'uk') return c.name_uk;
  return c.name_fr;
}

export default async function ProductPage({ params }: Props) {
  const product = await loadProduct(params.slug);

  if (!product) {
    notFound();
  }

  // Marché de la PAGE (produit), pas celui du visiteur — la disclosure, le
  // consentement et la langue du chrome doivent refléter le contenu affiché.
  const market: Market = isValidMarket(product.market) ? product.market : DEFAULT_MARKET;
  const t = SITE_COPY[market];
  const p = t.product;

  // Audit C3 : une fiche ne répond que sur le domaine de son marché.
  redirectToMarketDomain(market, `/${product.slug}`);

  // Track page view (non-blocking)
  trackServerPageView(product.id);

  const [categories, related, abTest] = await Promise.all([
    getNavCategories(market),
    getRelatedProducts(product, market),
    getActiveABTest(product.id),
  ]);

  // A/B test : variante persistée par cookie pour qu'un visiteur voie
  // toujours la même (comportement conservé de l'ancienne page).
  let abVariant: 'a' | 'b' | null = null;
  let heroTitle: string | null = null;
  let heroSubtitle: string | null = null;
  let heroCta: string | null = null;

  if (abTest) {
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

  const gallery = getProductGallery(product);
  const category = categories.find((c) => c.id === product.category_id) ?? null;
  const source = getProductSource(product.affiliate_url);
  const sourceLabel = TOP_VENTES_SOURCES.find((s) => s.key === source)?.label ?? null;

  const display = getDisplayPrice(product, p.locale, market);
  const priceLabel = display?.label ?? null;
  const priceNote = display?.merchantPrice && display.checkedAt ? p.priceNote(display.checkedAt) : null;
  const title = heroTitle || product.hero_title || product.name;
  const subtitle = heroSubtitle || product.hero_subtitle;
  const ctaLabel = heroCta || p.seeOffer(sourceLabel);

  const benefits = (product.benefits || []).filter((b) => b && b.title?.trim());
  // Même filtre que le JSON-LD FAQPage : ce que Google lit = ce que le visiteur voit.
  const faq = (product.faq || []).filter((f) => f && f.question?.trim() && f.answer?.trim());
  const paragraphs = (product.description || '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  const showDescription = paragraphs.length > 0 || sourceLabel !== null || category !== null;
  const showPoints = benefits.length > 0;
  const videoId = getYouTubeId(product.video_url);
  const showFaq = faq.length > 0;

  const checkIcon = <Check className="w-5 h-5 text-site-secondary flex-shrink-0 mt-0.5" strokeWidth={2.6} aria-hidden="true" />;

  return (
    <div className="min-h-screen bg-site-bg text-site-text flex flex-col">
      <PixelInjector pixelMeta={product.pixel_meta} pixelTiktok={product.pixel_tiktok} pixelGtm={product.pixel_gtm} />
      <ProductStructuredData
        product={product}
        market={market}
        categoryName={category ? categoryName(category, market) : null}
        categorySlug={category ? category.slug : null}
      />

      <SiteHeader categories={categories} market={market} />
      <AffiliateDisclosureBanner market={market} />

      <main className="flex-1 pb-24 sm:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-16">
          {/* Fil d'Ariane */}
          <nav
            aria-label={p.breadcrumbAria}
            className="text-[13px] text-site-text-secondary flex flex-wrap gap-1.5 mb-5"
          >
            <Link href="/" className="hover:text-site-cta transition-colors">{p.breadcrumbHome}</Link>
            {category && (
              <>
                <span aria-hidden="true">/</span>
                <Link href={categoryPath(category.slug, market)} className="hover:text-site-cta transition-colors">
                  {categoryName(category, market)}
                </Link>
              </>
            )}
            <span aria-hidden="true">/</span>
            <span className="text-site-text">{product.name}</span>
          </nav>

          {/* Bloc principal : galerie + boîte d'achat */}
          <div className="flex flex-wrap gap-8 items-start">
            <div className="flex-[1.5_1_520px] min-w-0">
              <ProductGallery
                images={gallery}
                alt={product.name}
                labels={{
                  galleryAria: p.galleryAria,
                  photoAria: gallery.map((_, i) => p.photoAria(i + 1, gallery.length)),
                  prevPhoto: p.prevPhoto,
                  nextPhoto: p.nextPhoto,
                  zoomHint: p.zoomHint,
                  noPhoto: p.noPhoto,
                }}
              />
            </div>

            <aside className="flex-[1_1_340px] min-w-0 bg-white border border-site-border rounded-2xl p-6 sm:p-7 flex flex-col gap-[18px] shadow-[0_8px_24px_rgba(27,42,74,0.06)]">
              {sourceLabel && <span className="text-[13px] text-site-text-secondary">{p.availableOn(sourceLabel)}</span>}
              <h1 className="text-2xl sm:text-[28px] leading-tight font-extrabold text-site-primary">{title}</h1>
              {subtitle && <p className="text-[15px] leading-relaxed text-site-text-secondary">{subtitle}</p>}

              {priceLabel && (
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                  <span className="text-4xl font-extrabold text-site-cta">{priceLabel}</span>
                </div>
              )}

              {priceNote && (
                <p className="text-xs leading-normal text-site-text-secondary border border-site-border rounded-lg px-3 py-2 bg-site-surface/40">
                  {priceNote}
                </p>
              )}

              {product.free_shipping && <FreeShippingBadge label={t.common.freeShipping} sub={p.freeShippingSub} />}

              {benefits.length > 0 && (
                <ul className="flex flex-col gap-2.5 text-[15px]">
                  {benefits.slice(0, 5).map((b, i) => (
                    <li key={i} className="flex gap-2.5 items-start">
                      {checkIcon}
                      <span>{b.title}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ProductCTA
                redirectCode={product.redirect_code}
                productId={product.id}
                label={ctaLabel}
                className="w-full text-[17px] px-5 py-4"
              />
              <p className="text-xs leading-normal text-site-text-secondary text-center">{p.redirectNote}</p>

              <div className="flex flex-wrap gap-x-[18px] gap-y-2.5 pt-4 border-t border-site-border text-[13px] text-site-text-secondary">
                <span className="flex gap-1.5 items-center">
                  <Lock className="w-[18px] h-[18px] text-site-primary" aria-hidden="true" />
                  {p.securePayment}
                </span>
                <span className="flex gap-1.5 items-center">
                  <Truck className="w-[18px] h-[18px] text-site-primary" aria-hidden="true" />
                  {p.deliveryMerchant}
                </span>
              </div>
            </aside>
          </div>

          {/* Onglets d'ancrage */}
          {(showDescription || showPoints || showFaq) && (
            <div className="mt-14 border-b border-site-border flex flex-wrap gap-x-8 gap-y-1 text-[15px] font-semibold">
              {showDescription && (
                <a href="#description" className="py-3.5 border-b-[3px] border-site-primary text-site-primary">
                  {p.tabDescription}
                </a>
              )}
              {showPoints && (
                <a href="#points" className="py-3.5 text-site-text-secondary hover:text-site-cta transition-colors">
                  {p.tabPoints}
                </a>
              )}
              {showFaq && (
                <a href="#faq" className="py-3.5 text-site-text-secondary hover:text-site-cta transition-colors">
                  {p.tabFaq}
                </a>
              )}
            </div>
          )}

          {showDescription && (
            <section id="description" className="pt-9 pb-2 flex flex-wrap gap-8 scroll-mt-52">
              {paragraphs.length > 0 && (
                <div className="flex-[1.4_1_420px] min-w-0">
                  <h2 className="text-2xl font-extrabold text-site-primary mb-3.5">{p.whyChosen}</h2>
                  <div className="flex flex-col gap-3.5">
                    {paragraphs.map((para, i) => (
                      <p
                        key={i}
                        className={`text-base leading-[1.7] ${i === 0 ? 'text-site-text' : 'text-site-text-secondary'}`}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex-[1_1_300px] min-w-0 self-start bg-white border border-site-border rounded-2xl p-6">
                <h3 className="text-base font-bold text-site-primary mb-3.5">{p.inBrief}</h3>
                <dl className="grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-2.5 text-sm">
                  <dt className="text-site-text-secondary">{p.briefMarket}</dt>
                  <dd className="font-semibold">{getMarketLabel(market)}</dd>
                  {sourceLabel && (
                    <>
                      <dt className="text-site-text-secondary">{p.briefSoldBy}</dt>
                      <dd className="font-semibold">{product.seller_name ? `${sourceLabel} · ${product.seller_name}` : sourceLabel}</dd>
                    </>
                  )}
                  {category && (
                    <>
                      <dt className="text-site-text-secondary">{p.briefCategory}</dt>
                      <dd className="font-semibold">{categoryName(category, market)}</dd>
                    </>
                  )}
                </dl>
              </div>
            </section>
          )}

          {videoId && (
            <section id="video" className="pt-9 pb-2 scroll-mt-52">
              <h2 className="text-2xl font-extrabold text-site-primary mb-5">{p.videoTitle}</h2>
              <ProductVideo
                videoId={videoId}
                title={product.name}
                labels={{ play: p.videoPlay, watchOnYoutube: p.videoOnYoutube }}
              />
            </section>
          )}

          {showPoints && (
            <section id="points" className="pt-9 pb-2 scroll-mt-52">
              <h2 className="text-2xl font-extrabold text-site-primary mb-5">{p.pointsTitle}</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
                {benefits.map((b, i) => (
                  <div key={i} className="bg-white border border-site-border rounded-[14px] p-[22px]">
                    <div
                      className="w-10 h-10 rounded-full bg-[#EAF2FB] flex items-center justify-center text-lg mb-3.5"
                      aria-hidden="true"
                    >
                      {b.icon}
                    </div>
                    <h3 className="text-base font-bold mb-1.5">{b.title}</h3>
                    <p className="text-sm leading-relaxed text-site-text-secondary">{b.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showFaq && (
            <section id="faq" className="pt-9 pb-2 max-w-[820px] scroll-mt-52">
              <h2 className="text-2xl font-extrabold text-site-primary mb-5">{p.faqTitle}</h2>
              <div className="flex flex-col gap-2.5">
                {faq.map((item, i) => (
                  <details key={i} className="group bg-white border border-site-border rounded-xl px-5">
                    <summary className="py-4 text-base font-semibold flex justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <span
                        aria-hidden="true"
                        className="text-site-secondary text-xl leading-none transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-[15px] leading-relaxed text-site-text-secondary">{item.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Vous aimerez aussi */}
          {related.length > 0 && (
            <section className="pt-12">
              <h2 className="text-2xl font-extrabold text-site-primary mb-5">{p.relatedTitle}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {related.map((r) => (
                  <ProductCard key={r.id} product={r} market={market} variant="boxed" />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter categories={categories} market={market} />

      {/* Barre d'achat mobile */}
      <MobileBuyBar
        redirectCode={product.redirect_code}
        productId={product.id}
        productName={product.name}
        priceLabel={priceLabel}
        ctaLabel={p.seeOfferShort}
      />

      {/* Exit intent popup */}
      {product.exit_intent_enabled !== false && (
        <ExitIntentPopup productName={product.name} redirectCode={product.redirect_code} market={market} />
      )}

      {/* Email capture popup */}
      {product.email_capture_enabled && (
        <EmailCapturePopup
          productId={product.id}
          productName={product.name}
          slug={product.slug}
          discount={product.email_capture_discount || 10}
          market={market}
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
    </div>
  );
}
