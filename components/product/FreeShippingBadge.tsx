import { Truck } from 'lucide-react';

interface Props {
  label: string;
  sub?: string;
  /** "large" = encart bien visible de la fiche produit ; "small" = pastille de carte. */
  size?: 'large' | 'small';
}

/** Mise en avant de la livraison gratuite (vert, bien visible). */
export default function FreeShippingBadge({ label, sub, size = 'large' }: Props) {
  if (size === 'small') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
        <Truck className="w-3.5 h-3.5" aria-hidden="true" />
        {label}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-3">
      <Truck className="w-7 h-7 text-emerald-700 shrink-0" aria-hidden="true" />
      <div className="leading-tight">
        <p className="text-base font-extrabold text-emerald-800">{label}</p>
        {sub && <p className="text-xs text-emerald-700 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
