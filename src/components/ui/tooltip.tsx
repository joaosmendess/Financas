// Tooltip do shadcn/ui (Radix). Usado nos botões só com ícone (editar, excluir, mês…).
import { Tooltip as T } from 'radix-ui'
import type { ReactElement } from 'react'

export const DicasProvider = ({ children }: { children: React.ReactNode }) => (
  <T.Provider delayDuration={400} skipDelayDuration={200}>{children}</T.Provider>
)

export function Dica({ texto, children }: { texto: string; children: ReactElement }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content className="dica" sideOffset={6}>
          {texto}
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}
