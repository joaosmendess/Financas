import { pct, somar } from './dinheiro'
import { minhaParte } from './fatura'
import type { Centavos, Config, ContaFixa, Divida, Lancamento, Mes, Meta } from './tipos'

export interface Saldo {
  renda: Centavos
  minhaFatura: Centavos
  contasFixas: Centavos
  guardar: Centavos
  euDevo: Centavos
  sobra: Centavos
  /** % da renda que sobra (0 sem renda). */
  pctLivre: number
}

export function contasAtivas(contas: readonly ContaFixa[]): ContaFixa[] {
  return contas.filter((c) => c.ativa)
}

export function guardarPorMes(metas: readonly Meta[]): Centavos {
  return somar(metas, (m) => m.mensal_centavos)
}

/** O que eu devo a outras pessoas com mês = mes (pago ou não: é dinheiro que sai neste mês). */
export function euDevoNoMes(dividas: readonly Divida[], mes: Mes): Centavos {
  return somar(dividas.filter((d) => d.direcao === 'eu_devo' && d.mes === mes), (d) => d.valor_centavos)
}

/**
 * Saldo previsto = renda − minha parte da fatura − contas fixas ativas − mensal das metas
 *                  − o que eu devo no mês.
 * `itensDaFatura` deve ser o resultado de itensFatura() (reais ou projetados).
 */
export function saldoPrevisto(args: {
  config: Pick<Config, 'renda_centavos'>
  itensDaFatura: readonly Lancamento[]
  contas: readonly ContaFixa[]
  metas: readonly Meta[]
  dividas: readonly Divida[]
  mes: Mes
}): Saldo {
  const renda = args.config.renda_centavos || 0
  const minhaFatura = minhaParte(args.itensDaFatura)
  const contasFixas = somar(contasAtivas(args.contas), (c) => c.valor_centavos)
  const guardar = guardarPorMes(args.metas)
  const euDevo = euDevoNoMes(args.dividas, args.mes)
  const sobra = renda - minhaFatura - contasFixas - guardar - euDevo
  return { renda, minhaFatura, contasFixas, guardar, euDevo, sobra, pctLivre: pct(sobra, renda) }
}
