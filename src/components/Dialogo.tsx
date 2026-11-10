import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface DialogoApi {
  abrir: (conteudo: ReactNode) => void
  fechar: () => void
}

const DialogoCtx = createContext<DialogoApi>({ abrir: () => {}, fechar: () => {} })

/** Um modal por vez, como no protótipo. */
export function DialogoProvider({ children }: { children: ReactNode }) {
  const [conteudo, setConteudo] = useState<ReactNode>(null)
  const modal = useRef<HTMLDivElement>(null)
  const anterior = useRef<HTMLElement | null>(null)

  const fechar = useCallback(() => {
    setConteudo(null)
    anterior.current?.focus?.()
  }, [])
  const abrir = useCallback((c: ReactNode) => {
    anterior.current = document.activeElement as HTMLElement | null
    setConteudo(c)
  }, [])

  useEffect(() => {
    if (!conteudo) return
    const t = setTimeout(() => modal.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('keydown', esc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', esc)
    }
  }, [conteudo, fechar])

  return (
    <DialogoCtx.Provider value={{ abrir, fechar }}>
      {children}
      <div className={`backdrop${conteudo ? ' open' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
        {conteudo && (
          <div className="modal" role="dialog" aria-modal="true" ref={modal}>
            {conteudo}
          </div>
        )}
      </div>
    </DialogoCtx.Provider>
  )
}

export const useDialogo = () => useContext(DialogoCtx)

/** Confirmação simples (excluir, marcar recebido…). */
export function Confirmar(props: { titulo: string; texto: ReactNode; rotulo: string; aoConfirmar: () => Promise<unknown> | void }) {
  const { fechar } = useDialogo()
  const [indo, setIndo] = useState(false)
  return (
    <>
      <h3>{props.titulo}</h3>
      <p>{props.texto}</p>
      <div className="mfoot">
        <button type="button" className="btn" onClick={fechar}>Cancelar</button>
        <button
          type="button"
          className="btn primary"
          disabled={indo}
          onClick={async () => {
            setIndo(true)
            try {
              await props.aoConfirmar()
              fechar()
            } catch {
              setIndo(false)
            }
          }}
        >
          {props.rotulo}
        </button>
      </div>
    </>
  )
}
