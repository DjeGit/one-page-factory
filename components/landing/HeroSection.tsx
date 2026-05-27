import Image from 'next/image';
import CTAButton from './CTAButton';
import { getProductImageUrl } from '@/lib/cloudinary';
import type { Product } from '@/types';

interface HeroSectionProps {
  product: Product;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroCta?: string | null;
}

export default function HeroSection({ product, heroTitle, heroSubtitle, heroCta }: HeroSectionProps) {
  const discount =
    product.original_price && product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  const imageUrl = getProductImageUrl(product.image_url, 600, 600);

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-gray-950 via-primary-950 to-gray-900 flex items-center overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent" />
      </div>

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-accent-500/20 border border-accent-500/30 text-accent-400 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-pulse-slow">
              <span>⚡</span>
              <span>Tendance — Stock limité</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              {heroTitle || product.hero_title || product.name}
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-300 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              {heroSubtitle || product.hero_subtitle || product.description}
            </p>

            {/* Price Block */}
            {(product.price || product.original_price) && (
              <div className="flex items-center gap-4 justify-center lg:justify-start mb-8">
                <div className="text-5xl font-black text-white">
                  {product.price?.toFixed(2)}€
                </div>
                {product.original_price && (
                  <div className="flex flex-col items-start">
                    <span className="text-gray-400 line-through text-xl">
                      {product.original_price?.toFixed(2)}€
                    </span>
                    {discount && (
                      <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-md">
                        -{discount}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <CTAButton
                redirectCode={product.redirect_code}
                productId={product.id}
                label={heroCta || '🛒 Commander maintenant'}
                size="xl"
                className="w-full sm:w-auto"
              />
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                <span>Livraison rapide</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                <span>Garantie satisfait</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span>
                <span>Paiement sécurisé 🔒</span>
              </div>
            </div>
          </div>

          {/* Right: Image */}
          <div className="order-1 lg:order-2 flex justify-center">
            <div className="relative w-full max-w-lg">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-primary-600/30 rounded-3xl blur-2xl scale-95" />

              <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-4 border border-white/10 backdrop-blur-sm">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="w-full h-auto rounded-2xl object-cover"
                  priority
                  unoptimized={imageUrl.includes('placehold.co')}
                />

                {/* Floating badge */}
                {discount && (
                  <div className="absolute -top-4 -right-4 bg-red-500 text-white font-black text-lg w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 rotate-12">
                    -{discount}%
                  </div>
                )}
              </div>

              {/* Social proof floating card */}
              <div className="absolute -bottom-4 left-4 bg-white rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-bounce-slow">
                <div className="flex -space-x-2">
                  {['#7C3AED', '#F59E0B', '#10B981'].map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      {['M', 'T', 'S'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">+1 247 clients</div>
                  <div className="flex text-yellow-400 text-xs">★★★★★</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
