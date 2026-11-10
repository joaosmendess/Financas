// Dialog do shadcn/ui (Radix) com o visual do protótipo (.modal).
// Radix cuida de: foco preso no modal, Esc, clique fora, travar a rolagem e devolver o foco.
import { Dialog as D } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Modal(props: { aberto: boolean; aoFechar: () => void; children: ReactNode }) {
  return (
    <D.Root open={props.aberto} onOpenChange={(o) => !o && props.aoFechar()}>
      <D.Portal>
        <D.Overlay className="rdx-overlay" />
        <D.Content className="modal rdx-modal" aria-describedby={undefined}>
          {props.children}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

/** Título do modal (obrigatório para leitores de tela). */
export function ModalTitulo({ className, ...p }: ComponentProps<'h3'>) {
  return (
    <D.Title asChild>
      <h3 className={className} {...p} />
    </D.Title>
  )
}

export function ModalFechar({ className, ...p }: ComponentProps<'button'>) {
  return (
    <D.Close asChild>
      <button type="button" className={cn('btn', className)} {...p} />
    </D.Close>
  )
}
