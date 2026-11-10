import { somar } from './dinheiro'
import { EU, type Centavos, type Divida, type Lancamento, type Mes, type Pessoa } from './tipos'

/** Algo que alguém me deve: uma compra minha no cartão feita por outra pessoa, ou uma dívida avulsa. */
export interface Pendencia {
  origem: 'lancamento' | 'divida'
  id: string
  pessoa_id: string
  descricao: string
  valor_centavos: Centavos
  mes: Mes
  parcela: string | null
  recebido: boolean
}

function deLancamento(l: Lancamento): Pendencia {
  return {
    origem: 'lancamento', id: l.id, pessoa_id: l.dono, descricao: l.descricao,
    valor_centavos: l.valor_centavos, mes: l.mes_fatura, parcela: l.parcela, recebido: l.recebido,
  }
}

function deDivida(d: Divida): Pendencia {
  return {
    origem: 'divida', id: d.id, pessoa_id: d.pessoa_id, descricao: d.descricao,
    valor_centavos: d.valor_centavos, mes: d.mes, parcela: null, recebido: d.recebido,
  }
}

/**
 * Tudo o que me devem (recebido ou não): lançamentos com dono ≠ 'eu' + dívidas 'me_deve'.
 * Use só lançamentos reais aqui (nunca os projetados).
 */
export function tudoQueMeDevem(lancamentos: readonly Lancamento[], dividas: readonly Divida[]): Pendencia[] {
  return [
    ...lancamentos.filter((l) => l.dono && l.dono !== EU).map(deLancamento),
    ...dividas.filter((d) => d.direcao === 'me_deve').map(deDivida),
  ]
}

/** Quem me deve: só o que ainda não recebi. */
export function aReceber(lancamentos: readonly Lancamento[], dividas: readonly Divida[]): Pendencia[] {
  return tudoQueMeDevem(lancamentos, dividas).filter((p) => !p.recebido)
}

/** Quem eu devo: dívidas 'eu_devo' (todas, ou só as pendentes). */
export function tudoQueEuDevo(dividas: readonly Divida[], soPendentes = false): Pendencia[] {
  return dividas.filter((d) => d.direcao === 'eu_devo' && (!soPendentes || !d.recebido)).map(deDivida)
}

export interface TotalPessoa {
  pessoa: Pessoa
  total: Centavos
  itens: Pendencia[]
}

const PESSOA_DESCONHECIDA = (id: string): Pessoa => ({ id, nome: 'Sem pessoa', cor: '#8A93A3' })

/** Agrupa por pessoa, maior total primeiro, só quem tem total > 0. */
export function porPessoa(pendencias: readonly Pendencia[], pessoas: readonly Pessoa[]): TotalPessoa[] {
  const grupos = new Map<string, Pendencia[]>()
  for (const p of pendencias) grupos.set(p.pessoa_id, [...(grupos.get(p.pessoa_id) ?? []), p])
  return [...grupos]
    .map(([id, itens]) => ({
      pessoa: pessoas.find((p) => p.id === id) ?? PESSOA_DESCONHECIDA(id),
      total: somar(itens, (x) => x.valor_centavos),
      itens,
    }))
    .filter((g) => g.total > 0)
    .sort((a, b) => b.total - a.total)
}

/** Itens de uma pessoa separados em pendentes e já resolvidos (tela Quem me deve). */
export function itensDaPessoa(
  todos: readonly Pendencia[],
  pessoaId: string,
): { pendentes: Pendencia[]; resolvidos: Pendencia[] } {
  const daPessoa = todos.filter((p) => p.pessoa_id === pessoaId)
  return { pendentes: daPessoa.filter((p) => !p.recebido), resolvidos: daPessoa.filter((p) => p.recebido) }
}
