// Tabs do shadcn/ui (Radix) com o visual de segmento do protótipo (.tabs).
import { Tabs as T } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const Abas = T.Root
export const AbaConteudo = T.Content

export function AbasLista({ className, ...p }: ComponentProps<typeof T.List>) {
  return <T.List className={cn('tabs', className)} {...p} />
}

export function Aba(p: ComponentProps<typeof T.Trigger>) {
  return <T.Trigger {...p} />
}
