import { diferencaMeses } from './meses'
import type { Lancamento, LancamentoFatura, Mes } from './tipos'

/** "02/10", "2/10", "2 / 10" → [2, 10]. Qualquer outra coisa → null. */
export function lerParcela(p: string | null | undefined): [number, number] | null {
  const m = /(\d+)\s*\/\s*(\d+)/.exec(String(p ?? ''))
  if (!m) return null
  const a = +m[1]!
  const b = +m[2]!
  return a >= 1 && b >= 1 && a <= b ? [a, b] : null
}

export function formatarParcela(a: number, b: number): string {
  return `${String(a).padStart(2, '0')}/${String(b).padStart(2, '0')}`
}

/**
 * Normaliza a parcela digitada ou lida da planilha para 'NN/NN'.
 * Trata o caso em que o Excel converteu "2/10" em data: em pt-BR vira 2 de outubro
 * (dia 2, mês 10); em en-US vira 10 de fevereiro. Como a parcela atual nunca passa
 * do total, quando o primeiro número é maior os dois são invertidos.
 */
export function normalizarParcela(v: unknown): string | null {
  let a: number
  let b: number
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    // +12h e leitura em UTC: funciona para datas à meia-noite local ou à meia-noite UTC.
    const d = new Date(v.getTime() + 12 * 3600e3)
    a = d.getUTCDate()
    b = d.getUTCMonth() + 1
  } else {
    const m = /^\s*\(?\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*\)?\s*$/.exec(String(v ?? ''))
    if (!m) return null
    a = +m[1]!
    b = +m[2]!
  }
  if (a > b) [a, b] = [b, a]
  if (a < 1) return null
  return formatarParcela(a, b)
}

/** Procura uma parcela no fim da descrição, ex.: "LOJA X 02/05". */
export function parcelaNaDescricao(desc: string): string | null {
  const m = /(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.exec(desc)
  return m ? normalizarParcela(`${m[1]}/${m[2]}`) : null
}

/**
 * Projeção de um mês sem lançamentos: pega o último mês com dados antes dele e
 * repete as parcelas que ainda continuam. A parcela a/b continua enquanto a + n ≤ b,
 * onde n é a distância em meses.
 */
export function projetar(todos: readonly Lancamento[], mes: Mes): LancamentoFatura[] {
  let base: Mes | null = null
  for (const l of todos) if (l.mes_fatura < mes && (base === null || l.mes_fatura > base)) base = l.mes_fatura
  if (base === null) return []
  const n = diferencaMeses(base, mes)
  const out: LancamentoFatura[] = []
  for (const l of todos) {
    if (l.mes_fatura !== base) continue
    const p = lerParcela(l.parcela)
    if (!p || p[0] + n > p[1]) continue
    out.push({
      ...l,
      id: 'proj-' + l.id,
      mes_fatura: mes,
      parcela: formatarParcela(p[0] + n, p[1]),
      recebido: false,
      projetado: true,
    })
  }
  return out
}
