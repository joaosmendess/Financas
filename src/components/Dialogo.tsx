import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Modal, ModalTitulo } from './ui/dialog'

interface DialogoApi {
  abrir: (conteudo: ReactNode) => void
  fechar: () => void
}

const DialogoCtx = createContext<DialogoApi>({ abrir: () => {}, fechar: () => {} })

/**
 * Um modal por vez, como no protótipo. Usa o Dialog do shadcn/ui (Radix): foco preso,
 * Esc e clique fora fecham, rolagem travada e foco devolvido a quem abriu.
 */
export function DialogoProvider({ children }: { children: ReactNode }) {
  const [conteudo, setConteudo] = useState<ReactNode>(null)
  const fechar = useCallback(() => setConteudo(null), [])
  const abrir = useCallback((c: ReactNode) => setConteudo(c), [])
  return (
    <DialogoCtx.Provider value={{ abrir, fechar }}>
      {children}
      <Modal aberto={conteudo !== null} aoFechar={fechar}>
        {conteudo}
      </Modal>
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
      <ModalTitulo>{props.titulo}</ModalTitulo>
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
