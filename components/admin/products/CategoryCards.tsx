import Link from 'next/link';
import type { CategoryCount } from '@/lib/admin-products-view';

interface Totals {
  total: number;
  live: number;
  draft: number;
}

/** Une catégorie n'apparaît sur le site que si elle contient au moins un produit EN LIGNE sur ce marché. */
function HiddenBadge() {
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
      title="Cette catégorie n'est pas visible sur le site de ce marché tant qu'elle ne contient aucun produit en ligne"
    >
      masquée du site
    </span>
  );
}

function Stats({ live, draft, total, showHidden = true }: Totals & { showHidden?: boolean }) {
  if (total === 0) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-gray-400">Aucun produit</span>
        {showHidden && <HiddenBadge />}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm font-semibold text-gray-700">
        {total} produit{total > 1 ? 's' : ''}
      </span>
      {live > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{live} en ligne</span>}
      {draft > 0 && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          {draft} brouillon{draft > 1 ? 's' : ''}
        </span>
      )}
      {showHidden && live === 0 && <HiddenBadge />}
    </div>
  );
}

/** Page d'accueil des produits : une carte par catégorie (icône, nom, compteurs), puis « Tous » et « Sans catégorie ». */
export default function CategoryCards({ categories, all, none }: { categories: CategoryCount[]; all: Totals; none: Totals }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/admin/products?cat=${encodeURIComponent(c.slug)}`}
            className={`group flex items-center gap-4 rounded-2xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${
              c.total === 0 ? 'bg-white/60 border-dashed border-gray-300 hover:border-primary-400' : 'bg-white border-gray-200 hover:border-primary-400'
            }`}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-3xl group-hover:bg-primary-100 transition-colors" aria-hidden>
              {c.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-gray-900 truncate">{c.name}</span>
              <Stats total={c.total} live={c.live} draft={c.draft} />
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/products?cat=all" className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary-400 hover:shadow-sm transition-all">
          <span className="text-xl" aria-hidden>🗂️</span>
          <span className="font-semibold text-gray-900">Tous les produits</span>
          <span className="text-sm text-gray-500">({all.total})</span>
        </Link>
        {none.total > 0 && (
          <Link href="/admin/products?cat=none" className="inline-flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:border-amber-400 transition-all">
            <span className="text-xl" aria-hidden>❓</span>
            <span className="font-semibold text-amber-900">Sans catégorie</span>
            <span className="text-sm text-amber-700">({none.total})</span>
          </Link>
        )}
      </div>
    </div>
  );
}
