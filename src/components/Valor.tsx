import { partes } from '@/domain/dinheiro'
import type { Centavos } from '@/domain/tipos'
import { useContagem } from '@/lib/useContagem'

/** Número grande do protótipo: R$ cinza, inteiro forte, centavos menores. Conta até o valor ao mudar. */
export function Valor({ c, tamanho = 'b-l' }: { c: Centavos; tamanho?: 'b-xl' | 'b-l' | 'b-m' }) {
  const animado = useContagem(c)
  const p = partes(animado)
  return (
    <span className={`big ${tamanho}${c < 0 ? ' neg' : ''}`} aria-label={`${c < 0 ? 'menos ' : ''}R$ ${partes(c).inteiro},${partes(c).centavos}`}>
      <span className="cur" aria-hidden="true">{p.negativo ? '\u2212' : ''}R$</span>
      <span className="int" aria-hidden="true">{p.inteiro}</span>
      <span className="cents" aria-hidden="true">,{p.centavos}</span>
    </span>
  )
}
