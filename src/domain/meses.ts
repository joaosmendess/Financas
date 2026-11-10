import type { Mes } from './tipos'

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const
export const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const

const RE_MES = /^(\d{4})-(\d{2})$/

export function ehMes(s: unknown): s is Mes {
  if (typeof s !== 'string') return false
  const m = RE_MES.exec(s)
  return !!m && +m[2]! >= 1 && +m[2]! <= 12
}

function separar(k: Mes): [number, number] {
  const m = RE_MES.exec(k)
  if (!m) throw new Error(`Mês inválido: ${k}`)
  return [+m[1]!, +m[2]!]
}

/** Monta 'YYYY-MM' a partir do ano e do mês 0-11. */
export function mesDe(ano: number, mes0: number): Mes {
  const y = ano + Math.floor(mes0 / 12)
  const m = ((mes0 % 12) + 12) % 12
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

export function mesDaData(d: Date): Mes {
  return mesDe(d.getFullYear(), d.getMonth())
}

export function somarMeses(k: Mes, n: number): Mes {
  const [y, m] = separar(k)
  return mesDe(y, m - 1 + n)
}

/** Quantos meses de a até b (b − a). */
export function diferencaMeses(a: Mes, b: Mes): number {
  const [ya, ma] = separar(a)
  const [yb, mb] = separar(b)
  return (yb - ya) * 12 + (mb - ma)
}

/** "dezembro" */
export function nomeMes(k: Mes): string {
  return MESES[separar(k)[1] - 1]!
}

/** "dezembro 2026" */
export function nomeMesAno(k: Mes): string {
  const [y, m] = separar(k)
  return `${MESES[m - 1]} ${y}`
}

/** "Dez", ou "Jan 27" quando o ano é diferente do ano de referência. */
export function nomeMesCurto(k: Mes, anoReferencia: number): string {
  const [y, m] = separar(k)
  return MESES_CURTOS[m - 1]! + (y !== anoReferencia ? ' ' + String(y).slice(2) : '')
}

/**
 * Fatura aberta: se hoje já passou do dia de fechamento, a fatura aberta é a do mês seguinte.
 * Ex.: fechamento dia 2, hoje 10/11 → fatura de dezembro. Hoje 02/11 → fatura de novembro.
 */
export function mesAberto(hoje: Date, diaFechamento: number): Mes {
  const k = mesDaData(hoje)
  return hoje.getDate() > (diaFechamento || 1) ? somarMeses(k, 1) : k
}

/** "05/12" a partir de '2026-12-05'. */
export function ddmm(iso: string | null): string {
  return iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—'
}
