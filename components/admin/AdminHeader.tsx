import MarketSwitcher from '@/components/admin/MarketSwitcher';

// Barre supérieure de l'admin — pour l'instant ne porte que le sélecteur de
// marché (en haut à droite, comme demandé), extensible plus tard (fil
// d'ariane, notifications intégrations, etc.).
export default function AdminHeader() {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-end px-6 flex-shrink-0">
      <MarketSwitcher />
    </header>
  );
}
