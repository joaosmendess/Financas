import { useEffect, useRef, useState } from 'react'

const reduzir = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Anima um número do valor anterior até o novo (ease-out, ~650ms).
 * Na primeira vez conta a partir de 0. Com "reduzir movimento", vai direto ao valor.
 */
export function useContagem(alvo: number, duracao = 650): number {
  const [atual, setAtual] = useState(() => (reduzir() ? alvo : 0))
  const de = useRef(atual)
  useEffect(() => {
    if (reduzir()) {
      setAtual(alvo)
      de.current = alvo
      return
    }
    const inicio = performance.now()
    const origem = de.current
    let quadro = 0
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao)
      const v = origem + (alvo - origem) * (1 - Math.pow(1 - p, 3))
      setAtual(p < 1 ? Math.round(v) : alvo)
      de.current = p < 1 ? v : alvo
      if (p < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, duracao])
  return atual
}
