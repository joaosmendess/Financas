import { partes } from '@/domain/dinheiro'
import type { Centavos } from '@/domain/tipos'

/** Número grande do protótipo: R$ cinza, inteiro forte, centavos menores. */
export function Valor({ c, tamanho = 'b-l' }: { c: Centavos; tamanho?: 'b-xl' | 'b-l' | 'b-m' }) {
  const p = partes(c)
  return (
    <span className={`big ${tamanho}${p.negativo ? ' neg' : ''}`}>
      <span className="cur">{p.negativo ? '\u2212' : ''}R$</span>
      <span className="int">{p.inteiro}</span>
      <span className="cents">,{p.centavos}</span>
    </span>
  )
}
