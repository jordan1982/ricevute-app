import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Mancano VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (vedi .env.example).')
}

// PKCE: il ritorno da Google usa "?code=" e non l’hash, quindi non entra in conflitto con HashRouter.
// La anon key è pubblica per progetto: la sicurezza è garantita dalle policy RLS (vedi supabase/schema.sql).
export const supabase = createClient(url, anonKey, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
