import { describe, expect, it } from 'vitest'
import { CATEGORIAS, categoria, normalizar } from './categoria'

describe('categoria automática', () => {
  it.each([
    ['UBER *TRIP', 'Transporte'],
    ['99APP *99', 'Transporte'],
    ['POSTO IPIRANGA', 'Transporte'],
    ['IFOOD *RESTAURANTE', 'Alimentação'],
    ['OUTBACK', 'Alimentação'],
    ['SUSHI GUGA', 'Alimentação'],
    ['MERCADOLIVRE', 'Compras'],
    ['MERCADO LIVRE*M', 'Compras'],
    ['GBARBOSA', 'Supermercado'],
    ['ASSAÍ ATACADISTA', 'Supermercado'],
    ['DROGASIL', 'Saúde'],
    ['APPLE.COM/BILL', 'Assinaturas'],
    ['WELLHUB', 'Assinaturas'],
    ['SMART FIT', 'Lazer'],
    ['CASA ESPORTIVA', 'Lazer'],
    ['C&A', 'Vestuário'],
    ['CEA MCO 440', 'Vestuário'],
    ['LOJAS RENNER', 'Vestuário'],
    ['YOUCOM', 'Vestuário'],
    ['KIKO COSMETICS BRASIL', 'Compras'],
    ['ALMEIDA REFRIGERACAO', 'Serviços'],
    ['PATRICIA VAZ DA COSTA', 'Outros'],
  ])('%s → %s', (desc, cat) => {
    expect(categoria(desc)).toBe(cat)
  })

  it('não confunde palavras parecidas', () => {
    expect(categoria('BARBEARIA')).toBe('Outros') // "bar" só como palavra
    expect(categoria('MAXIMUS')).toBe('Outros') // "max" só como palavra
    expect(categoria('LOJA 1990')).toBe('Outros') // "99" só como palavra
  })
})

describe('auxiliares', () => {
  it('normalizar tira acento e caixa', () => {
    expect(normalizar('  Lançamentos ')).toBe('lancamentos')
  })
  it('as 12 categorias da planilha', () => {
    expect(CATEGORIAS.map((c) => c.nome)).toHaveLength(12)
  })
})
