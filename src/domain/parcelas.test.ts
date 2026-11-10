import { describe, expect, it } from 'vitest'
import { lanc } from './__testes__/fabrica'
import { formatarParcela, lerParcela, normalizarParcela, parcelaNaDescricao, projetar } from './parcelas'

describe('lerParcela', () => {
  it('lê a/b com ou sem zero e espaços', () => {
    expect(lerParcela('02/10')).toEqual([2, 10])
    expect(lerParcela('2/2')).toEqual([2, 2])
    expect(lerParcela(' 3 / 6 ')).toEqual([3, 6])
  })
  it('rejeita vazio e parcela impossível', () => {
    expect(lerParcela(null)).toBeNull()
    expect(lerParcela('')).toBeNull()
    expect(lerParcela('7/5')).toBeNull()
    expect(lerParcela('0/3')).toBeNull()
  })
})

describe('normalizarParcela', () => {
  it('padroniza para NN/NN', () => {
    expect(normalizarParcela('2/10')).toBe('02/10')
    expect(normalizarParcela('(6/10)')).toBe('06/10')
    expect(formatarParcela(1, 3)).toBe('01/03')
  })
  it('converte de volta a parcela que o Excel transformou em data (pt-BR)', () => {
    // "2/10" em pt-BR = 2 de outubro
    expect(normalizarParcela(new Date(2026, 9, 2))).toBe('02/10')
    // data em UTC à meia-noite (como o SheetJS às vezes devolve)
    expect(normalizarParcela(new Date(Date.UTC(2026, 9, 2)))).toBe('02/10')
  })
  it('inverte quando o Excel leu em en-US ("2/10" = 10 de fevereiro)', () => {
    expect(normalizarParcela(new Date(2026, 1, 10))).toBe('02/10')
    expect(normalizarParcela('10/2')).toBe('02/10')
  })
  it('devolve null para o que não é parcela', () => {
    expect(normalizarParcela('')).toBeNull()
    expect(normalizarParcela('à vista')).toBeNull()
    expect(normalizarParcela(null)).toBeNull()
    expect(normalizarParcela(new Date('x'))).toBeNull()
  })
})

describe('parcelaNaDescricao', () => {
  it('acha a parcela no fim da descrição', () => {
    expect(parcelaNaDescricao('LOJA X 2/5')).toBe('02/05')
    expect(parcelaNaDescricao('LOJA X')).toBeNull()
  })
})

describe('projetar', () => {
  const nov = [
    lanc({ id: 'a', mes_fatura: '2026-11', parcela: '02/10', valor_centavos: 15741 }),
    lanc({ id: 'b', mes_fatura: '2026-11', parcela: '02/02', valor_centavos: 6999 }),
    lanc({ id: 'c', mes_fatura: '2026-11', parcela: null, valor_centavos: 590 }),
    lanc({ id: 'd', mes_fatura: '2026-11', parcela: '05/06', valor_centavos: 48533, dono: 'pai', recebido: true }),
  ]
  const antigo = lanc({ id: 'z', mes_fatura: '2026-09', parcela: '01/10' })

  it('continua as parcelas do último mês com dados', () => {
    const dez = projetar([antigo, ...nov], '2026-12')
    expect(dez.map((l) => [l.id, l.parcela])).toEqual([
      ['proj-a', '03/10'],
      ['proj-d', '06/06'],
    ])
    expect(dez.every((l) => l.projetado && l.mes_fatura === '2026-12')).toBe(true)
  })
  it('a/b continua enquanto a + n ≤ b', () => {
    expect(projetar(nov, '2027-03').map((l) => l.parcela)).toEqual(['06/10'])
    expect(projetar(nov, '2027-07').map((l) => l.parcela)).toEqual(['10/10'])
    expect(projetar(nov, '2027-08')).toEqual([])
  })
  it('projeção zera o recebido e mantém o dono', () => {
    const [, d] = projetar(nov, '2026-12')
    expect(d).toMatchObject({ dono: 'pai', recebido: false })
  })
  it('sem mês anterior com dados não projeta nada', () => {
    expect(projetar(nov, '2026-11')).toEqual([])
    expect(projetar(nov, '2026-10')).toEqual([])
    expect(projetar([], '2026-12')).toEqual([])
  })
})
