// Affiché tout de suite pendant que la page demandée charge ses données (au lieu d'un écran figé
// pendant plusieurs secondes après un clic dans le menu).
export default function AdminLoading() {
  return (
    <div className="p-8 animate-pulse" role="status" aria-live="polite" aria-label="Chargement de la page">
      <div className="h-7 w-64 bg-gray-200 rounded-lg mb-3" />
      <div className="h-4 w-96 max-w-full bg-gray-100 rounded mb-8" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-white border border-gray-200 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-white border border-gray-200 rounded-2xl" />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}
