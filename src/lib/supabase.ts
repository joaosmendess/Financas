import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

if (!url || !key) {
  throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local (veja .env.example).')
}

export const supabase = createClient<Database>(url, key, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Lança o erro do Supabase ou devolve os dados. */
type Resposta = { data: unknown; error: { message: string } | null }
export function ok<R extends Resposta>(r: R): Extract<R, { error: null }>['data'] {
  if (r.error) throw new Error(r.error.message)
  return r.data as Extract<R, { error: null }>['data']
}
