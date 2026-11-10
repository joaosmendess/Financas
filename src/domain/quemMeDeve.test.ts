import { describe, expect, it } from 'vitest'
import { divida, lanc, pessoa } from './__testes__/fabrica'
import { aReceber, itensDaPessoa, porPessoa, tudoQueEuDevo, tudoQueMeDevem } from './quemMeDeve'

const painho = pessoa({ id: 'pai', nome: 'Painho', cor: '#2563EB' })
const sthe = pessoa({ id: 'sthe', nome: 'Sthe', cor: '#E5466F' })

const lancamentos = [
  lanc({ id: 'l1', dono: 'eu', valor_centavos: 999 }),
  lanc({ id: 'l2', dono: 'pai', valor_centavos: 48533, parcela: '05/06' }),
  lanc({ id: 'l3', dono: 'pai', valor_centavos: 11645, recebido: true }),
  lanc({ id: 'l4', dono: 'sthe', valor_centavos: 14993, mes_fatura: '2026-11' }),
]
const dividas = [
  divida({ id: 'd1', pessoa_id: 'pai', valor_centavos: 15000 }),
  divida({ id: 'd2', pessoa_id: 'sthe', valor_centavos: 5000, recebido: true }),
  divida({ id: 'd3', pessoa_id: 'sthe', valor_centavos: 30000, direcao: 'eu_devo' }),
]

describe('quem me deve', () => {
  it('lançamentos com dono ≠ eu e dívidas me_deve, sem os recebidos', () => {
    expect(aReceber(lancamentos, dividas).map((p) => [p.origem, p.id])).toEqual([
      ['lancamento', 'l2'],
      ['lancamento', 'l4'],
      ['divida', 'd1'],
    ])
  })
  it('vale para todos os meses e mantém a parcela', () => {
    const l4 = aReceber(lancamentos, dividas).find((p) => p.id === 'l4')
    expect(l4).toMatchObject({ mes: '2026-11', pessoa_id: 'sthe' })
    expect(aReceber(lancamentos, dividas)[0]!.parcela).toBe('05/06')
  })
  it('agrupa por pessoa, maior total primeiro', () => {
    const g = porPessoa(aReceber(lancamentos, dividas), [painho, sthe])
    expect(g.map((x) => [x.pessoa.nome, x.total, x.itens.length])).toEqual([
      ['Painho', 63533, 2],
      ['Sthe', 14993, 1],
    ])
  })
  it('separa pendentes e recebidos da pessoa', () => {
    const r = itensDaPessoa(tudoQueMeDevem(lancamentos, dividas), 'pai')
    expect(r.pendentes.map((p) => p.id)).toEqual(['l2', 'd1'])
    expect(r.resolvidos.map((p) => p.id)).toEqual(['l3'])
  })
  it('pessoa que não existe mais aparece como "Sem pessoa"', () => {
    const g = porPessoa(aReceber([lanc({ dono: 'sumiu' })], []), [])
    expect(g[0]!.pessoa).toMatchObject({ id: 'sumiu', nome: 'Sem pessoa' })
  })
})

describe('quem eu devo', () => {
  it('só dívidas eu_devo', () => {
    expect(tudoQueEuDevo(dividas).map((p) => p.id)).toEqual(['d3'])
    expect(tudoQueEuDevo([divida({ direcao: 'eu_devo', recebido: true })], true)).toEqual([])
  })
})
