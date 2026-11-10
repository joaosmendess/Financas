import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { aoErro } from '@/lib/queryClient'

const ToastCtx = createContext<(texto: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState('')
  const [visivel, setVisivel] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const mostrar = useCallback((t: string) => {
    setTexto(t)
    setVisivel(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisivel(false), 2600)
  }, [])

  useEffect(() => aoErro(mostrar), [mostrar])

  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className={`toast${visivel ? ' on' : ''}`} role="status">{texto}</div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
