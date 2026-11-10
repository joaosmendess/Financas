// Fábricas de dados para os testes do domínio.
import type { ContaFixa, Divida, Lancamento, Meta, Pessoa } from '../tipos'

let seq = 0
const id = (p: string) => `${p}${++seq}`

export const lanc = (o: Partial<Lancamento> = {}): Lancamento => ({
  id: id('l'), mes_fatura: '2026-12', data_compra: null, descricao: 'COMPRA', valor_centavos: 1000,
  parcela: null, categoria: null, dono: 'eu', recebido: false, ...o,
})
export const conta = (o: Partial<ContaFixa> = {}): ContaFixa => ({
  id: id('c'), nome: 'Conta', valor_centavos: 1000, dia: 5, ativa: true, ...o,
})
export const divida = (o: Partial<Divida> = {}): Divida => ({
  id: id('d'), pessoa_id: 'pai', descricao: 'Pix', valor_centavos: 1000, mes: '2026-12',
  recebido: false, direcao: 'me_deve', ...o,
})
export const meta = (o: Partial<Meta> = {}): Meta => ({
  id: id('m'), emoji: '🎯', nome: 'Meta', alvo_centavos: 100000, atual_centavos: 0,
  mensal_centavos: 10000, prazo: null, dia: 10, ...o,
})
export const pessoa = (o: Partial<Pessoa> = {}): Pessoa => ({ id: id('p'), nome: 'Fulano', cor: '#2563EB', ...o })
