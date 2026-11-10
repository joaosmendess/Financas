import { describe, expect, it } from 'vitest'
import { conta, meta } from './__testes__/fabrica'
import { CHAVE_FATURA, chaveConta, chaveMeta, contasDoMes, metaDaChave, resumoContas } from './contasAPagar'

const config = { cartao_nome: 'Itaú Platinum', dia_vencimento: 9 }
const aluguel = conta({ id: 'alu', nome: 'Aluguel', valor_centavos: 120000, dia: 5 })
const internet = conta({ id: 'net', nome: 'Internet', valor_centavos: 9990, dia: 9 })
const inativa = conta({ id: 'x', nome: 'Velha', ativa: false })
const reserva = meta({ id: 'res', nome: 'Reserva', mensal_centavos: 70000, dia: 10 })
const semMensal = meta({ id: 'nada', mensal_centavos: 0 })

describe('contasDoMes', () => {
  const itens = contasDoMes({
    config, totalFatura: 238211, contas: [internet, aluguel, inativa], metas: [reserva, semMensal],
    pagos: new Set([chaveConta('alu')]),
  })

  it('junta fatura, contas ativas e metas com mensal, por dia e maior valor', () => {
    expect(itens.map((i) => [i.nome, i.dia, i.valor_centavos])).toEqual([
      ['Aluguel', 5, 120000],
      ['Fatura Itaú Platinum', 9, 238211],
      ['Internet', 9, 9990],
      ['Guardar: Reserva', 10, 70000],
    ])
  })
  it('marca o que está pago pelas chaves', () => {
    expect(itens.filter((i) => i.pago).map((i) => i.chave)).toEqual(['c:alu'])
    expect(itens[1]!.chave).toBe(CHAVE_FATURA)
    expect(itens[3]).toMatchObject({ chave: chaveMeta('res'), tipo: 'meta', meta_id: 'res' })
  })
  it('resumo: em aberto, pagas, próxima e dias', () => {
    expect(resumoContas(itens)).toMatchObject({
      emAberto: 238211 + 9990 + 70000, pagas: 1, total: 4, dias: [5, 9, 10],
    })
    expect(resumoContas(itens).proxima?.chave).toBe(CHAVE_FATURA)
  })
})

describe('metaDaChave', () => {
  it('extrai o id da meta', () => {
    expect(metaDaChave('m:abc')).toBe('abc')
    expect(metaDaChave('c:abc')).toBeNull()
  })
})
