// DropdownMenu do shadcn/ui (Radix) com o visual do menu "Adicionar" do protótipo.
import { DropdownMenu as M } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const Menu = M.Root
export const MenuGatilho = M.Trigger

export function MenuConteudo({ className, sideOffset = 6, align = 'end', ...p }: ComponentProps<typeof M.Content>) {
  return (
    <M.Portal>
      <M.Content sideOffset={sideOffset} align={align} className={cn('menu rdx-menu', className)} {...p} />
    </M.Portal>
  )
}

export function MenuItem({ className, ...p }: ComponentProps<typeof M.Item>) {
  return <M.Item className={cn('rdx-item', className)} {...p} />
}
