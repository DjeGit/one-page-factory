import Image from 'next/image';
import CTAButton from './CTAButton';
import { getProductImageUrl } from '@/lib/cloudinary';
import type { Product } from '@/types';

interface ProductShowcaseProps {
  product: Product;
}

export default function ProductShowcase({ product }: ProductShowcaseProps) {
  const imageUrl = getProductImageUrl(product.image_url, 500, 500);
  const discount =
    product.original_price && product.price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : null;

  return (
    <section className="py-20 bg-gradient-to-br from-primary-950 to-gray-950">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-8 lg:p-12">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Image */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-600/20 rounded-2xl blur-xl" />
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="relative rounded-2xl w-full max-w-sm object-cover"
                    unoptimized={imageUrl.includes('placehold.co')}
                  />
                </div>
              </div>

              {/* Content */}
              <div>
                <h2 className="text-3xl font-black text-white mb-4">{product.name}</h2>
                {product.description && (
                  <p className="text-gray-300 mb-6 leading-relaxed">{product.description}</p>
                )}

                {/* Price */}
                <div className="flex items-center gap-4 mb-8">
                  {product.price && (
                    <span className="text-4xl font-black text-white">{product.price.toFixed(2)}€</span>
                  )}
                  {product.original_price && (
                    <span className="text-xl text-gray-500 line-through">{product.original_price.toFixed(2)}€</span>
                  )}
                  {discount && (
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 text-sm font-bold px-3 py-1 rounded-full">
                      Économisez {discount}%
                    </span>
                  )}
                </div>

                {/* Features list */}
                <ul className="space-y-3 mb-8">
                  {[
                    'Livraison rapide et sécurisée',
                    'Support client réactif 7j/7',
                    'Garantie satisfaction ou remboursé',
                    'Emballage soigné et discret',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <span className="text-green-400 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <CTAButton
                  redirectCode={product.redirect_code}
                  productId={product.id}
                  label="Je veux ce produit"
                  size="lg"
                  className="w-full justify-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
