import type { Pessoa } from '@/domain/tipos'

export function Avatar({ pessoa, pequeno }: { pessoa: Pick<Pessoa, 'nome' | 'cor'>; pequeno?: boolean }) {
  return (
    <span className={`avatar${pequeno ? ' av-sm' : ''}`} style={{ background: pessoa.cor }} aria-hidden="true">
      {(pessoa.nome[0] ?? '?').toUpperCase()}
    </span>
  )
}

export function Ponto({ cor }: { cor: string }) {
  return <span className="dot" style={{ background: cor }} aria-hidden="true" />
}
