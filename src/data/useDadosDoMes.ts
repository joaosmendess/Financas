// Junta as consultas e aplica as regras do domínio para o mês selecionado.
import { useMemo } from 'react'
import { categoria } from '@/domain/categoria'
import { contasDoMes, resumoContas } from '@/domain/contasAPagar'
import {
  faturaProjetada, itensFatura, lancamentosDoMes, minhaParte, parteDosOutros, porCategoria, proximasFaturas, totalFatura,
} from '@/domain/fatura'
import { aReceber, porPessoa, tudoQueEuDevo } from '@/domain/quemMeDeve'
import { saldoPrevisto } from '@/domain/saldo'
import { CONFIG_PADRAO, type Mes } from '@/domain/tipos'
import { useMes } from '@/state/mes'
import { useConfig, useContasFixas, useDividas, useLancamentos, useMetas, usePagamentos, usePessoas } from './consultas'

const VAZIO: never[] = []

export function useDadosDoMes(mesForcado?: Mes) {
  const sel = useMes()
  const mes = mesForcado ?? sel.mes
  const qConfig = useConfig()
  const qPessoas = usePessoas()
  const qLanc = useLancamentos()
  const qContas = useContasFixas()
  const qDividas = useDividas()
  const qMetas = useMetas()
  const qPagos = usePagamentos(mes)

  const config = qConfig.data ?? CONFIG_PADRAO
  const pessoas = qPessoas.data ?? VAZIO
  const lancamentos = qLanc.data ?? VAZIO
  const contas = qContas.data ?? VAZIO
  const dividas = qDividas.data ?? VAZIO
  const metas = qMetas.data ?? VAZIO
  const pagos = qPagos.data

  const calculado = useMemo(() => {
    const itens = itensFatura(lancamentos, mes)
    const total = totalFatura(itens)
    const pendentes = aReceber(lancamentos, dividas)
    const contasMes = contasDoMes({ config, totalFatura: total, contas, metas, pagos: pagos ?? new Set() })
    return {
      itens,
      reais: lancamentosDoMes(lancamentos, mes),
      projetada: faturaProjetada(lancamentos, mes),
      total,
      minha: minhaParte(itens),
      outros: parteDosOutros(itens),
      categorias: porCategoria(itens, categoria),
      proximas: proximasFaturas(lancamentos, mes),
      saldo: saldoPrevisto({ config, itensDaFatura: itens, contas, metas, dividas, mes }),
      contasMes,
      resumo: resumoContas(contasMes),
      pendentes,
      devedores: porPessoa(pendentes, pessoas),
      euDevoPendente: porPessoa(tudoQueEuDevo(dividas, true), pessoas),
    }
  }, [lancamentos, dividas, contas, metas, pessoas, config, pagos, mes])

  const carregando = [qConfig, qPessoas, qLanc, qContas, qDividas, qMetas].some((q) => q.isPending)
  const vazio = !carregando && !lancamentos.length && !contas.length && !metas.length && !dividas.length && !config.renda_centavos

  return { mes, aberto: sel.aberto, config, pessoas, lancamentos, contas, dividas, metas, carregando, vazio, ...calculado }
}
