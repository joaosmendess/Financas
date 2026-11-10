import { describe, expect, it } from 'vitest'
import { formatar, paraCampo, parseValor, partes, pct, somar } from './dinheiro'

describe('formatar', () => {
  it('usa vírgula nos centavos e ponto no milhar', () => {
    expect(formatar(530428)).toBe('R$ 5.304,28')
    expect(formatar(123456789)).toBe('R$ 1.234.567,89')
    expect(formatar(0)).toBe('R$ 0,00')
    expect(formatar(5)).toBe('R$ 0,05')
  })
  it('negativos levam o sinal − na frente', () => {
    expect(formatar(-766622)).toBe('− R$ 7.666,22')
  })
})

describe('partes', () => {
  it('separa inteiro e centavos para o número grande', () => {
    expect(partes(1937950)).toEqual({ negativo: false, inteiro: '19.379', centavos: '50' })
    expect(partes(-1)).toEqual({ negativo: true, inteiro: '0', centavos: '01' })
  })
})

describe('parseValor', () => {
  it('lê formatos brasileiros', () => {
    expect(parseValor('30,93')).toBe(3093)
    expect(parseValor('1.234,56')).toBe(123456)
    expect(parseValor('R$ 2.150,00')).toBe(215000)
    expect(parseValor('R$ 485,33')).toBe(48533)
    expect(parseValor('1.234')).toBe(123400)
  })
  it('lê ponto decimal e números da planilha', () => {
    expect(parseValor('30.93')).toBe(3093)
    expect(parseValor(69.99)).toBe(6999)
    expect(parseValor(149.57)).toBe(14957)
    expect(parseValor(-5992.99)).toBe(-599299)
    expect(parseValor('-10,50')).toBe(-1050)
  })
  it('devolve null quando não é número', () => {
    expect(parseValor('')).toBeNull()
    expect(parseValor(null)).toBeNull()
    expect(parseValor('abc')).toBeNull()
    expect(parseValor('12abc')).toBeNull()
    expect(parseValor(Number.NaN)).toBeNull()
  })
})

describe('paraCampo', () => {
  it('converte centavos para o texto do formulário', () => {
    expect(paraCampo(123456)).toBe('1234,56')
    expect(parseValor(paraCampo(123456))).toBe(123456)
  })
})

describe('pct e somar', () => {
  it('pct arredonda e protege divisão por zero', () => {
    expect(pct(530428, 2800000)).toBe(19)
    expect(pct(10, 0)).toBe(0)
  })
  it('somar usa o seletor', () => {
    expect(somar([{ v: 1 }, { v: 2 }], (x) => x.v)).toBe(3)
  })
})
