import { describe, expect, it } from 'vitest'
import { lanc } from './__testes__/fabrica'
import {
  faturaAberta, faturaProjetada, itensFatura, minhaParte, parteDosOutros, porCategoria,
  proximasFaturas, totalFatura, totalPorDono,
} from './fatura'

const todos = [
  lanc({ mes_fatura: '2026-11', parcela: '01/03', valor_centavos: 20000 }),
  lanc({ mes_fatura: '2026-11', valor_centavos: 590 }),
  lanc({ mes_fatura: '2026-12', parcela: '02/03', valor_centavos: 20000 }),
  lanc({ mes_fatura: '2026-12', valor_centavos: 5000, dono: 'pai', categoria: 'Vestuário' }),
  lanc({ mes_fatura: '2026-12', valor_centavos: 3000, dono: 'sthe', descricao: 'UBER' }),
]

describe('itensFatura', () => {
  it('usa os lançamentos reais quando o mês tem dados', () => {
    const it = itensFatura(todos, '2026-12')
    expect(it).toHaveLength(3)
    expect(it.every((l) => !l.projetado)).toBe(true)
    expect(faturaProjetada(todos, '2026-12')).toBe(false)
  })
  it('projeta quando o mês está vazio', () => {
    const it = itensFatura(todos, '2027-01')
    expect(it.map((l) => l.parcela)).toEqual(['03/03'])
    expect(faturaProjetada(todos, '2027-01')).toBe(true)
  })
})

describe('totais', () => {
  const dez = itensFatura(todos, '2026-12')
  it('total, minha parte e parte dos outros', () => {
    expect(totalFatura(dez)).toBe(28000)
    expect(minhaParte(dez)).toBe(20000)
    expect(parteDosOutros(dez)).toBe(8000)
  })
  it('por dono', () => {
    expect(Object.fromEntries(totalPorDono(dez))).toEqual({ eu: 20000, pai: 5000, sthe: 3000 })
  })
  it('próximas faturas', () => {
    expect(proximasFaturas(todos, '2026-12')).toEqual([
      { mes: '2026-12', total: 28000, projetada: false },
      { mes: '2027-01', total: 20000, projetada: true },
      { mes: '2027-02', total: 0, projetada: true },
    ])
  })
})

describe('porCategoria', () => {
  it('usa a categoria gravada ou a automática, maior primeiro', () => {
    const r = porCategoria(itensFatura(todos, '2026-12'), (d) => (d === 'UBER' ? 'Transporte' : 'Outros'))
    expect(r).toEqual([
      { nome: 'Outros', total: 20000 },
      { nome: 'Vestuário', total: 5000 },
      { nome: 'Transporte', total: 3000 },
    ])
  })
})

describe('faturaAberta', () => {
  it('aberta até o fim do dia de fechamento', () => {
    expect(faturaAberta('2026-12', 2, new Date(2026, 10, 10))).toBe(true)
    expect(faturaAberta('2026-12', 2, new Date(2026, 11, 2, 23, 0))).toBe(true)
    expect(faturaAberta('2026-12', 2, new Date(2026, 11, 3))).toBe(false)
  })
})
