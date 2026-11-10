import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { useConfig } from '@/data/consultas'
import { ehMes, mesAberto } from '@/domain/meses'
import { CONFIG_PADRAO, type Mes } from '@/domain/tipos'

/** Mês da fatura aberta hoje, pelo dia de fechamento da config. */
export function useMesAberto(): Mes {
  const { data } = useConfig()
  return mesAberto(new Date(), data?.dia_fechamento ?? CONFIG_PADRAO.dia_fechamento)
}

/**
 * Mês selecionado no topo. Fica na URL (?mes=2026-12) para sobreviver a reload
 * e à troca de tela; sem parâmetro, é a fatura aberta.
 */
export function useMes(): { mes: Mes; aberto: Mes; setMes: (m: Mes) => void } {
  const [params, setParams] = useSearchParams()
  const aberto = useMesAberto()
  const p = params.get('mes')
  const mes = ehMes(p) ? p : aberto
  const setMes = useCallback(
    (m: Mes) =>
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual)
          if (m === aberto) novo.delete('mes')
          else novo.set('mes', m)
          return novo
        },
        { replace: true },
      ),
    [setParams, aberto],
  )
  return { mes, aberto, setMes }
}
