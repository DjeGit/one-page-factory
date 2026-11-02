import Link from 'next/link';
import type { CatParam, CategoryCount } from '@/lib/admin-products-view';

/** Barre d'icônes des catégories : permet de changer de catégorie sans repasser par l'accueil. */
export default function CategoryBar({ categories, current, allTotal, noneTotal }: { categories: CategoryCount[]; current: CatParam; allTotal: number; noneTotal: number }) {
  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-primary-600 border-primary-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400 hover:text-primary-700'
    }`;
  const count = (n: number, active: boolean) => <span className={`text-xs ${active ? 'text-primary-100' : 'text-gray-400'}`}>{n}</span>;
  return (
    <nav aria-label="Catégories" className="flex gap-2 overflow-x-auto pb-1">
      <Link href="/admin/products?cat=all" className={chip(current.kind === 'all')}>
        <span aria-hidden>🗂️</span> Tous {count(allTotal, current.kind === 'all')}
      </Link>
      {categories.map((c) => {
        const active = current.kind === 'slug' && current.slug === c.slug;
        return (
          <Link key={c.id} href={`/admin/products?cat=${encodeURIComponent(c.slug)}`} className={chip(active)} title={c.name} aria-current={active ? 'page' : undefined}>
            <span aria-hidden>{c.icon}</span>
            <span className="hidden md:inline">{c.name}</span>
            {count(c.total, active)}
          </Link>
        );
      })}
      {noneTotal > 0 && (
        <Link href="/admin/products?cat=none" className={chip(current.kind === 'none')}>
          <span aria-hidden>❓</span> Sans catégorie {count(noneTotal, current.kind === 'none')}
        </Link>
      )}
    </nav>
  );
}
