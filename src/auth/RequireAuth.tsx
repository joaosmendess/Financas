import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

export function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center text-muted" role="status">
      Carregando…
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <Carregando />
  if (!session) return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />
  return children
}
