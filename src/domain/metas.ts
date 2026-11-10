import { pct, somar } from './dinheiro'
import { diferencaMeses } from './meses'
import type { Centavos, Mes, Meta } from './tipos'

export function totalGuardado(metas: readonly Meta[]): Centavos {
  return somar(metas, (m) => m.atual_centavos)
}

/**
 * Marcar "Guardar: <meta>" como pago soma o mensal no valor atual; desmarcar subtrai.
 * Nunca fica negativo. Devolve o novo atual_centavos.
 */
export function efeitoPagamentoMeta(meta: Pick<Meta, 'atual_centavos' | 'mensal_centavos'>, marcando: boolean): Centavos {
  return Math.max(0, meta.atual_centavos + (marcando ? 1 : -1) * meta.mensal_centavos)
}

/** "Guardar valor" e "Retirar" na tela de metas. */
export function depositar(meta: Pick<Meta, 'atual_centavos'>, valor: Centavos): Centavos {
  return meta.atual_centavos + Math.max(0, valor)
}
export function retirar(meta: Pick<Meta, 'atual_centavos'>, valor: Centavos): Centavos {
  return Math.max(0, meta.atual_centavos - Math.max(0, valor))
}

export interface ProgressoMeta {
  /** 0 a 100 */
  pct: number
  falta: Centavos
  batida: boolean
  /** Meses de hoje até o prazo (null sem prazo). */
  mesesRestantes: number | null
  /** Quanto precisa guardar por mês para chegar no prazo (null se não dá para calcular). */
  precisaPorMes: Centavos | null
}

export function progressoMeta(meta: Meta, mesAtual: Mes): ProgressoMeta {
  const falta = Math.max(0, meta.alvo_centavos - meta.atual_centavos)
  const mesesRestantes = meta.prazo ? diferencaMeses(mesAtual, meta.prazo) : null
  return {
    pct: Math.min(100, pct(meta.atual_centavos, meta.alvo_centavos)),
    falta,
    batida: falta <= 0,
    mesesRestantes,
    precisaPorMes: mesesRestantes !== null && mesesRestantes > 0 && falta > 0 ? Math.ceil(falta / mesesRestantes) : null,
  }
}
