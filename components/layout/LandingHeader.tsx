'use client';

import Link from 'next/link';
import { useState } from 'react';

interface LandingHeaderProps {
  productName?: string;
  affiliateUrl?: string;
}

export default function LandingHeader({ productName, affiliateUrl }: LandingHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-white/10 sticky top-0 z-50 bg-gray-950/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 font-bold text-lg tracking-tight flex-shrink-0">
          <span className="text-xl">⚡</span>
          <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">
            Tendpick
          </span>
        </Link>

        {/* Product name (desktop) */}
        {productName && (
          <p className="hidden sm:block text-xs text-gray-400 truncate max-w-sm">
            {productName}
          </p>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/produits"
            className="hidden sm:block text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Voir tous les produits
          </Link>
          {affiliateUrl && (
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-xs bg-violet-600 hover:bg-violet-500 transition-colors px-3 py-1.5 rounded-lg font-medium"
            >
              Acheter sur Amazon
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
