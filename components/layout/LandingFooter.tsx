import Link from 'next/link';
import type { Market } from '@/lib/market';
import { CONSENT_COPY } from '@/lib/consent-copy';

interface LandingFooterProps {
  market: Market;
}

export default function LandingFooter({ market }: LandingFooterProps) {
  return (
    <footer className="border-t border-white/10 bg-gray-950 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        {/* Disclaimer affiliation — localisé par marché, voir lib/consent-copy.ts */}
        <div className="bg-gray-900/60 border border-white/5 rounded-xl p-4 mb-8 text-xs text-gray-500 leading-relaxed">
          {CONSENT_COPY[market].footerDisclosure}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Link href="/" className="flex items-center gap-1.5 font-bold text-base mb-1">
              <span>⚡</span>
              <span className="bg-gradient-to-r from-violet-400 to-amber-400 bg-clip-text text-transparent">Tendpick</span>
            </Link>
            <p className="text-xs text-gray-500">Sélection de produits Amazon</p>
          </div>

          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-300 transition-colors">Accueil</Link>
            <Link href="/produits" className="hover:text-gray-300 transition-colors">Catalogue</Link>
            <Link href="/mentions-legales" className="hover:text-gray-300 transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="hover:text-gray-300 transition-colors">Politique de confidentialité</Link>
          </nav>

          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Tendpick</p>
        </div>
      </div>
    </footer>
  );
}
