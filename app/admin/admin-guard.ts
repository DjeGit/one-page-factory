/**
 * Garde d'authentification partagée du back-office.
 *
 * POURQUOI : app/admin/layout.tsx affiche le formulaire de connexion quand on
 * n'est pas connecté, mais Next.js (app router) rend le layout ET la page en
 * parallèle : la page s'exécutait donc quand même, avec toutes ses requêtes
 * Supabase (3 à 5 s de latence et de la charge pour un simple visiteur non
 * connecté). La page elle-même doit refuser de travailler.
 *
 * COMMENT : chaque page de app/admin est exportée via `withAdminAuth(...)`.
 * Non connecté, la page renvoie `null` immédiatement (aucune requête) et le
 * layout montre le formulaire de connexion. Le test tests/admin-page-guard.test.ts
 * échoue si une page est ajoutée sans cette garde : impossible de l'oublier.
 */
import { cookies } from 'next/headers';
import { isValidAdminCookie } from '@/lib/admin-auth';

/** Vrai si la requête en cours porte un cookie admin valide. Synchrone, sans requête réseau. */
export function isAdminAuthenticated(): boolean {
  // Pas de try/catch : cookies() doit pouvoir signaler à Next que la page est dynamique.
  return isValidAdminCookie(cookies().get('admin_auth')?.value);
}

type PageResult = React.ReactNode | Promise<React.ReactNode>;

/**
 * Enveloppe une page serveur : si l'utilisateur n'est pas connecté, la page ne
 * s'exécute pas (le layout affiche la connexion). À utiliser sur TOUTE page de app/admin :
 *   export default withAdminAuth(async function MaPage() { ... });
 */
export function withAdminAuth<P extends object>(page: (props: P) => PageResult): (props: P) => PageResult {
  return function GuardedAdminPage(props: P) {
    if (!isAdminAuthenticated()) return null;
    return page(props);
  };
}
