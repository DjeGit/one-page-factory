/**
 * OPF — Database connection pool (singleton)
 * Uses pg (node-postgres) with Supabase connection pooler
 *
 * DATABASE_URL format (Session pooler — Supabase Dashboard → Settings → Database → URI):
 *   postgresql://postgres.mnobovxoqzifnddpabou:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
 *
 * ⚠️  Ne jamais utiliser le "Transaction pooler" (port 6543) avec Next.js App Router.
 *     Le "Session pooler" (port 5432) est requis pour les prepared statements.
 */
import { Pool, PoolClient, QueryResult } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var _opfPgPool: Pool | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    '[OPF DB] DATABASE_URL manquant — ajouter dans .env.local:\n' +
    'DATABASE_URL=postgresql://postgres.mnobovxoqzifnddpabou:[MOT_DE_PASSE]@aws-0-[REGION].pooler.supabase.com:5432/postgres\n' +
    '→ Supabase Dashboard → Settings → Database → Connection string (Session pooler)'
  );
}

const pool: Pool =
  global._opfPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // requis pour Supabase
    max: 10,                             // pool réduit (Supabase limite les connexions)
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

// Préserver le pool entre les rechargements HMR en dev
if (process.env.NODE_ENV !== 'production') {
  global._opfPgPool = pool;
}

pool.on('error', (err) => {
  console.error('[OPF DB] Erreur pool inattendue:', err.message);
});

export { pool };

/** Exécute une requête et retourne les lignes typées */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result: QueryResult<T> = await pool.query(text, params);
  return result.rows;
}

/** Emprunte un client du pool pour des transactions multi-requêtes */
export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** Transaction automatique : COMMIT si succès, ROLLBACK si erreur */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
