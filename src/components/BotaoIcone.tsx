import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Dica } from './ui/tooltip'

/** Botão só com ícone: o rótulo vira aria-label e tooltip. */
export function BotaoIcone({ rotulo, children, className, ...p }: { rotulo: string; children: ReactNode } & ComponentProps<'button'>) {
  return (
    <Dica texto={rotulo}>
      <button type="button" className={cn('iconbtn', className)} aria-label={rotulo} {...p}>
        {children}
      </button>
    </Dica>
  )
}
