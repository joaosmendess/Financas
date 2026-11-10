import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { queryClient } from '@/lib/queryClient'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  carregando: boolean
  entrarComGoogle: () => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s)
      setCarregando(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    session,
    carregando,
    async entrarComGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    },
    async sair() {
      await supabase.auth.signOut()
      queryClient.clear()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

/** Nome e foto da conta Google. */
export function useUsuario() {
  const { session } = useAuth()
  const meta = session?.user.user_metadata as { full_name?: string; name?: string; avatar_url?: string } | undefined
  const nome = meta?.full_name ?? meta?.name ?? session?.user.email ?? 'Você'
  return { id: session?.user.id ?? null, nome, primeiroNome: nome.split(' ')[0] ?? nome, foto: meta?.avatar_url ?? null }
}
