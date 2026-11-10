import { somar } from './dinheiro'
import { somarMeses } from './meses'
import { projetar } from './parcelas'
import { EU, type Centavos, type Lancamento, type LancamentoFatura, type Mes } from './tipos'

export function lancamentosDoMes(todos: readonly Lancamento[], mes: Mes): Lancamento[] {
  return todos.filter((l) => l.mes_fatura === mes)
}

/** Itens da fatura: os lançamentos reais do mês, ou a projeção das parcelas se não houver nenhum. */
export function itensFatura(todos: readonly Lancamento[], mes: Mes): LancamentoFatura[] {
  const reais = lancamentosDoMes(todos, mes)
  return reais.length ? reais.map((l) => ({ ...l, projetado: false })) : projetar(todos, mes)
}

/** A fatura do mês é só projeção (não tem lançamentos reais)? */
export function faturaProjetada(todos: readonly Lancamento[], mes: Mes): boolean {
  return !todos.some((l) => l.mes_fatura === mes)
}

export function totalFatura(itens: readonly Lancamento[]): Centavos {
  return somar(itens, (l) => l.valor_centavos)
}

/** Minha parte: só o que tem dono 'eu'. */
export function minhaParte(itens: readonly Lancamento[]): Centavos {
  return somar(itens.filter((l) => l.dono === EU), (l) => l.valor_centavos)
}

/** Compras dos outros (dono ≠ 'eu'). */
export function parteDosOutros(itens: readonly Lancamento[]): Centavos {
  return somar(itens.filter((l) => l.dono !== EU), (l) => l.valor_centavos)
}

export function totalPorDono(itens: readonly Lancamento[]): Map<string, Centavos> {
  const m = new Map<string, Centavos>()
  for (const l of itens) m.set(l.dono, (m.get(l.dono) ?? 0) + l.valor_centavos)
  return m
}

export interface FaturaFutura {
  mes: Mes
  total: Centavos
  projetada: boolean
}

/** Fatura do mês e das próximas (card "Próximas faturas"). */
export function proximasFaturas(todos: readonly Lancamento[], mes: Mes, quantas = 3): FaturaFutura[] {
  return Array.from({ length: quantas }, (_, i) => {
    const k = somarMeses(mes, i)
    return { mes: k, total: totalFatura(itensFatura(todos, k)), projetada: faturaProjetada(todos, k) }
  })
}

/**
 * A fatura do mês ainda está aberta? Fica aberta até o fim do dia de fechamento
 * daquele mês (ex.: fatura de dezembro com fechamento dia 2 fecha em 02/12 às 23:59).
 */
export function faturaAberta(mes: Mes, diaFechamento: number, agora: Date): boolean {
  const [y, m] = mes.split('-').map(Number) as [number, number]
  const fecha = new Date(y, m - 1, diaFechamento || 1, 23, 59, 59)
  return agora <= fecha
}

export interface Categoria {
  nome: string
  total: Centavos
}

/** "Para onde foi a fatura": soma por categoria, maior primeiro. */
export function porCategoria(itens: readonly Lancamento[], categoriaDe: (desc: string) => string): Categoria[] {
  const m = new Map<string, Centavos>()
  for (const l of itens) {
    const c = l.categoria?.trim() || categoriaDe(l.descricao)
    m.set(c, (m.get(c) ?? 0) + l.valor_centavos)
  }
  return [...m].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total)
}
