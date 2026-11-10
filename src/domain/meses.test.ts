import { describe, expect, it } from 'vitest'
import {
  ddmm, diferencaMeses, ehMes, mesAberto, mesDe, nomeMes, nomeMesAno, nomeMesCurto, somarMeses,
} from './meses'

describe('aritmética de meses', () => {
  it('soma e subtrai atravessando o ano', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01')
    expect(somarMeses('2026-01', -1)).toBe('2025-12')
    expect(somarMeses('2026-05', 14)).toBe('2027-07')
    expect(somarMeses('2026-05', -17)).toBe('2024-12')
  })
  it('diferença entre meses', () => {
    expect(diferencaMeses('2026-11', '2027-02')).toBe(3)
    expect(diferencaMeses('2027-02', '2026-11')).toBe(-3)
    expect(diferencaMeses('2026-12', '2026-12')).toBe(0)
  })
  it('mesDe normaliza mês fora do intervalo', () => {
    expect(mesDe(2026, 12)).toBe('2027-01')
    expect(mesDe(2026, -1)).toBe('2025-12')
  })
  it('valida o formato', () => {
    expect(ehMes('2026-12')).toBe(true)
    expect(ehMes('2026-13')).toBe(false)
    expect(ehMes('2026-1')).toBe(false)
    expect(() => somarMeses('xx', 1)).toThrow()
  })
})

describe('mesAberto (fatura aberta)', () => {
  it('depois do fechamento é o mês seguinte', () => {
    expect(mesAberto(new Date(2026, 10, 10), 2)).toBe('2026-12')
    expect(mesAberto(new Date(2026, 11, 3), 2)).toBe('2027-01')
  })
  it('no dia do fechamento ou antes é o próprio mês', () => {
    expect(mesAberto(new Date(2026, 10, 2), 2)).toBe('2026-11')
    expect(mesAberto(new Date(2026, 10, 1), 2)).toBe('2026-11')
  })
  it('fechamento ausente vale como dia 1', () => {
    expect(mesAberto(new Date(2026, 10, 1), 0)).toBe('2026-11')
    expect(mesAberto(new Date(2026, 10, 2), 0)).toBe('2026-12')
  })
})

describe('nomes', () => {
  it('formata os nomes dos meses', () => {
    expect(nomeMes('2026-03')).toBe('março')
    expect(nomeMesAno('2026-12')).toBe('dezembro 2026')
    expect(nomeMesCurto('2026-12', 2026)).toBe('Dez')
    expect(nomeMesCurto('2027-01', 2026)).toBe('Jan 27')
  })
  it('ddmm', () => {
    expect(ddmm('2026-12-05')).toBe('05/12')
    expect(ddmm(null)).toBe('—')
  })
})
