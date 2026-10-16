import Link from 'next/link';
import { headers } from 'next/headers';
import { getRequestMarket } from '@/lib/site-url';

// Page 404 localisée (audit F1) : la page par défaut de Next est en anglais
// sur les trois domaines. Le statut HTTP reste 404 (Next le fixe), et la
// page est exclue de l'index par ce statut.
const COPY = {
  fr: { title: 'Page introuvable', text: "Cette page n'existe pas ou a été déplacée.", home: "Retour à l'accueil", catalog: 'Voir le catalogue' },
  es: { title: 'Página no encontrada', text: 'Esta página no existe o ha sido movida.', home: 'Volver al inicio', catalog: 'Ver el catálogo' },
  uk: { title: 'Page not found', text: "This page doesn't exist or has been moved.", home: 'Back to home', catalog: 'Browse the catalogue' },
} as const;

export default function NotFound() {
  const t = COPY[getRequestMarket(headers())];
  return (
    <main className="min-h-screen bg-site-bg text-site-text flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-extrabold text-site-primary mb-3">{t.title}</h1>
        <p className="text-site-text-secondary mb-6">{t.text}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="bg-site-cta hover:bg-site-cta-hover text-white font-bold rounded-xl px-5 py-3 transition-colors">
            {t.home}
          </Link>
          <Link href="/produits" className="border border-site-border bg-white font-semibold rounded-xl px-5 py-3 hover:border-site-secondary transition-colors">
            {t.catalog}
          </Link>
        </div>
      </div>
    </main>
  );
}
