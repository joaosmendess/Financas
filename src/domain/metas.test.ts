import { describe, expect, it } from 'vitest'
import { meta } from './__testes__/fabrica'
import { depositar, efeitoPagamentoMeta, progressoMeta, retirar, totalGuardado } from './metas'

describe('efeitoPagamentoMeta', () => {
  it('marcar soma o mensal, desmarcar subtrai', () => {
    const m = { atual_centavos: 240000, mensal_centavos: 70000 }
    expect(efeitoPagamentoMeta(m, true)).toBe(310000)
    expect(efeitoPagamentoMeta(m, false)).toBe(170000)
  })
  it('nunca fica negativo', () => {
    expect(efeitoPagamentoMeta({ atual_centavos: 100, mensal_centavos: 70000 }, false)).toBe(0)
  })
})

describe('depositar e retirar', () => {
  it('altera o atual sem ficar negativo', () => {
    expect(depositar({ atual_centavos: 100 }, 50)).toBe(150)
    expect(retirar({ atual_centavos: 100 }, 500)).toBe(0)
    expect(depositar({ atual_centavos: 100 }, -50)).toBe(100)
  })
})

describe('progressoMeta', () => {
  it('calcula % e quanto precisa por mês até o prazo', () => {
    const p = progressoMeta(meta({ alvo_centavos: 1100000, atual_centavos: 240000, prazo: '2027-10' }), '2026-11')
    expect(p).toEqual({ pct: 22, falta: 860000, batida: false, mesesRestantes: 11, precisaPorMes: 78182 })
  })
  it('sem prazo, prazo vencido e meta batida', () => {
    expect(progressoMeta(meta({ prazo: null }), '2026-11').precisaPorMes).toBeNull()
    expect(progressoMeta(meta({ prazo: '2026-10' }), '2026-11').precisaPorMes).toBeNull()
    const b = progressoMeta(meta({ alvo_centavos: 100, atual_centavos: 150, prazo: '2027-01' }), '2026-11')
    expect(b).toMatchObject({ pct: 100, falta: 0, batida: true, precisaPorMes: null })
  })
  it('totalGuardado', () => {
    expect(totalGuardado([meta({ atual_centavos: 1 }), meta({ atual_centavos: 2 })])).toBe(3)
  })
})
