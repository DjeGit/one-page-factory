import Link from 'next/link';
import type { Category } from '@/types';
import type { Market } from '@/lib/market';

interface Props {
  categories: Category[];
  market: Market;
}

function categoryName(c: Category, market: Market): string {
  if (market === 'es') return c.name_es;
  if (market === 'uk') return c.name_uk;
  return c.name_fr;
}

// Footer — design validé (Design.html) : fond navy, newsletter, mentions
// légales en bas. Repris tel quel sur toutes les pages du site (30/09) au
// lieu d'un footer simplifié différent par page.
//
// Ajustement du 02/10 (demande Jerome) : la maquette ne montre que 3
// catégories à titre d'exemple, mais Tendpick en a 8 — on les affiche
// toutes (sur 2 colonnes pour rester lisible), colonne élargie en
// conséquence (grille 5 colonnes au lieu de 4 en desktop).
//
// Écarts assumés vs la maquette : la maquette liste "CGV / Livraison /
// Contact" dans la colonne "Aide" — CGV et Livraison n'existent pas encore
// comme pages, donc pointer dessus créerait des liens morts. On garde la
// structure à l'identique (3 liens, même colonne) mais avec ce qui existe
// réellement : Mentions légales, Confidentialité, Contact (mailto, déjà
// utilisé ailleurs sur le site). Le formulaire newsletter est visuel pour
// l'instant (pas encore branché à /api/leads) — à connecter ensuite.
export default function SiteFooter({ categories, market }: Props) {
  return (
    <footer className="bg-site-primary text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col gap-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-8">
          <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
            <span className="font-extrabold text-lg lowercase">tendpick</span>
            <span className="text-xs text-white/60">Le comparateur des produits tendance, tous marchés.</span>
          </div>

          <div className="flex flex-col gap-2 col-span-2 sm:col-span-2">
            <span className="text-xs font-bold text-white">Catégories</span>
            {categories.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {categories.map((c) => (
                  <Link key={c.id} href={`/c/${c.slug}`} className="text-xs text-white/60 hover:text-white transition-colors">
                    {categoryName(c, market)}
                  </Link>
                ))}
              </div>
            ) : (
              <Link href="/produits" className="text-xs text-white/60 hover:text-white transition-colors">
                Tout le catalogue
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-white">Aide</span>
            <Link href="/mentions-legales" className="text-xs text-white/60 hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/politique-confidentialite" className="text-xs text-white/60 hover:text-white transition-colors">
              Confidentialité
            </Link>
            <a href="mailto:contact@tendpick.com" className="text-xs text-white/60 hover:text-white transition-colors">
              Contact
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-white">Newsletter</span>
            <label htmlFor="footer-newsletter-email" className="text-xs text-white/60">
              Les meilleures trouvailles, une fois par semaine
            </label>
            <div className="flex gap-2">
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="votre@email.com"
                className="flex-1 min-w-0 rounded-md border-none px-2.5 py-2 text-xs text-site-text focus:outline-none focus:ring-2 focus:ring-site-secondary"
              />
              <button
                type="button"
                title="Newsletter — bientôt disponible"
                className="bg-site-cta hover:bg-site-cta-hover transition-colors rounded-md px-3 py-2 text-xs font-semibold text-white shrink-0"
              >
                OK
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/15 pt-4 text-xs text-white/50">
          © {new Date().getFullYear()} Tendpick — Sélection affiliée,{' '}
          <Link href="/mentions-legales" className="underline hover:text-white/80 transition-colors">
            voir notre politique de transparence
          </Link>
        </div>
      </div>
    </footer>
  );
}
