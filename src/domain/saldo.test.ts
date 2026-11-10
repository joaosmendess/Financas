import { describe, expect, it } from 'vitest'
import { conta, divida, lanc, meta } from './__testes__/fabrica'
import { euDevoNoMes, guardarPorMes, saldoPrevisto } from './saldo'

describe('saldoPrevisto', () => {
  it('bate com a planilha de dezembro: 6.400 − 745,25 − 996,69 = 4.658,06', () => {
    const s = saldoPrevisto({
      config: { renda_centavos: 640000 },
      itensDaFatura: [
        lanc({ valor_centavos: 74525 }),
        lanc({ valor_centavos: 148786, dono: 'pai' }),
        lanc({ valor_centavos: 14900, dono: 'sthe' }),
      ],
      contas: [conta({ valor_centavos: 99669 })],
      metas: [],
      dividas: [],
      mes: '2026-12',
    })
    expect(s).toEqual({
      renda: 640000, minhaFatura: 74525, contasFixas: 99669, guardar: 0, euDevo: 0, sobra: 465806, pctLivre: 73,
    })
  })

  it('desconta contas ativas, mensal das metas e o que eu devo no mês', () => {
    const s = saldoPrevisto({
      config: { renda_centavos: 1000000 },
      itensDaFatura: [lanc({ valor_centavos: 200000 })],
      contas: [conta({ valor_centavos: 100000 }), conta({ valor_centavos: 50000, ativa: false })],
      metas: [meta({ mensal_centavos: 70000 }), meta({ mensal_centavos: 30000 })],
      dividas: [
        divida({ direcao: 'eu_devo', valor_centavos: 20000, mes: '2026-12' }),
        divida({ direcao: 'eu_devo', valor_centavos: 5000, mes: '2026-12', recebido: true }),
        divida({ direcao: 'eu_devo', valor_centavos: 99999, mes: '2027-01' }),
        divida({ direcao: 'me_deve', valor_centavos: 99999, mes: '2026-12' }),
      ],
      mes: '2026-12',
    })
    expect(s.sobra).toBe(1000000 - 200000 - 100000 - 100000 - 25000)
    expect(s.euDevo).toBe(25000)
  })

  it('sobra negativa e sem renda', () => {
    const s = saldoPrevisto({
      config: { renda_centavos: 0 },
      itensDaFatura: [lanc({ valor_centavos: 1000 })],
      contas: [], metas: [], dividas: [], mes: '2026-12',
    })
    expect(s.sobra).toBe(-1000)
    expect(s.pctLivre).toBe(0)
  })
})

describe('auxiliares', () => {
  it('guardarPorMes e euDevoNoMes', () => {
    expect(guardarPorMes([meta({ mensal_centavos: 1 }), meta({ mensal_centavos: 2 })])).toBe(3)
    expect(euDevoNoMes([divida({ direcao: 'eu_devo', valor_centavos: 7 })], '2026-11')).toBe(0)
  })
})
