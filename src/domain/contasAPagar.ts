import { somar } from './dinheiro'
import { contasAtivas } from './saldo'
import type { Centavos, Config, ContaFixa, Meta } from './tipos'

export type TipoItem = 'fatura' | 'conta' | 'meta'

export interface ItemAPagar {
  /** Chave gravada em pagamentos_mes.item_chave */
  chave: string
  nome: string
  valor_centavos: Centavos
  dia: number
  tipo: TipoItem
  meta_id?: string
  pago: boolean
}

export const CHAVE_FATURA = 'fatura'
export const chaveConta = (id: string) => `c:${id}`
export const chaveMeta = (id: string) => `m:${id}`
/** Se a chave for de meta, devolve o id da meta. */
export const metaDaChave = (chave: string): string | null => (chave.startsWith('m:') ? chave.slice(2) : null)

/**
 * Contas a pagar do mês: a fatura (no dia do vencimento) + contas fixas ativas
 * + "Guardar: <meta>" para cada meta com mensal > 0. Ordena por dia e, no mesmo dia, maior valor primeiro.
 */
export function contasDoMes(args: {
  config: Pick<Config, 'cartao_nome' | 'dia_vencimento'>
  totalFatura: Centavos
  contas: readonly ContaFixa[]
  metas: readonly Meta[]
  pagos: ReadonlySet<string>
}): ItemAPagar[] {
  const itens: Omit<ItemAPagar, 'pago'>[] = [
    {
      chave: CHAVE_FATURA,
      nome: `Fatura ${args.config.cartao_nome}`,
      valor_centavos: args.totalFatura,
      dia: args.config.dia_vencimento || 9,
      tipo: 'fatura',
    },
    ...contasAtivas(args.contas).map((c) => ({
      chave: chaveConta(c.id), nome: c.nome, valor_centavos: c.valor_centavos, dia: c.dia || 1, tipo: 'conta' as const,
    })),
    ...args.metas
      .filter((m) => m.mensal_centavos > 0)
      .map((m) => ({
        chave: chaveMeta(m.id), nome: `Guardar: ${m.nome}`, valor_centavos: m.mensal_centavos,
        dia: m.dia || 10, tipo: 'meta' as const, meta_id: m.id,
      })),
  ]
  return itens
    .sort((a, b) => a.dia - b.dia || b.valor_centavos - a.valor_centavos)
    .map((i) => ({ ...i, pago: args.pagos.has(i.chave) }))
}

export interface ResumoContas {
  emAberto: Centavos
  pagas: number
  total: number
  proxima: ItemAPagar | null
  /** Dias com vencimento, em ordem (os chips do card). */
  dias: number[]
}

export function resumoContas(itens: readonly ItemAPagar[]): ResumoContas {
  const abertos = itens.filter((i) => !i.pago)
  return {
    emAberto: somar(abertos, (i) => i.valor_centavos),
    pagas: itens.length - abertos.length,
    total: itens.length,
    proxima: abertos[0] ?? null,
    dias: [...new Set(itens.map((i) => i.dia))],
  }
}
