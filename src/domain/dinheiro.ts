import type { Centavos } from './tipos'

const MENOS = '−' // "−", como no protótipo

function agrupar(inteiro: number): string {
  return String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Separa um valor para exibir no formato grande do protótipo: R$ 5.304,28 */
export function partes(c: Centavos): { negativo: boolean; inteiro: string; centavos: string } {
  const abs = Math.abs(Math.round(c))
  return {
    negativo: c < 0,
    inteiro: agrupar(Math.floor(abs / 100)),
    centavos: String(abs % 100).padStart(2, '0'),
  }
}

/** "R$ 1.234,56" ou "− R$ 1.234,56" */
export function formatar(c: Centavos): string {
  const p = partes(c)
  return `${p.negativo ? MENOS + ' ' : ''}R$ ${p.inteiro},${p.centavos}`
}

/**
 * Lê um valor digitado ou vindo da planilha e devolve centavos.
 * Aceita "1.234,56", "1234,56", "R$ 30,93", "30.93", "1.234" (milhar) e números.
 * Devolve null se não for um número.
 */
export function parseValor(v: unknown): Centavos | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 100) : null
  let s = String(v ?? '')
    .replace(/r\$|\s| /gi, '')
    .replace(/−/g, '-')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return null
  return Math.round(parseFloat(s) * 100)
}

/** Centavos para o texto de um campo de formulário: 123456 → "1234,56" */
export function paraCampo(c: Centavos): string {
  const p = partes(c)
  return `${p.negativo ? '-' : ''}${p.inteiro.replace(/\./g, '')},${p.centavos}`
}

/** Percentual inteiro de a sobre b (0 se b ≤ 0). */
export function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

export function somar<T>(itens: readonly T[], f: (x: T) => number): Centavos {
  return itens.reduce((s, x) => s + (f(x) || 0), 0)
}
