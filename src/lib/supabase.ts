/**
 * Supabase clients — OPF
 *
 * Public client  : lecture seule, clé anon, côté client/server
 * Admin client   : service role, toutes permissions, SERVEUR UNIQUEMENT
 *
 * Usage dans les Server Components / Route Handlers :
 *   import { supabaseAdmin } from '@/lib/supabase'
 *   const { data } = await supabaseAdmin.from('products').select('*')
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL manquant');
if (!supabaseAnonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY manquant');

/** Client public — safe côté client */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Client admin — NE PAS exposer côté client */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
