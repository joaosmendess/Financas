import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { utils, type WorkBook } from 'xlsx'
import { meta, pessoa } from './__testes__/fabrica'
import { somar } from './dinheiro'
import {
  dataISO, lerPlanilha, mesNoTexto, montarImportacao, parcelaDoTexto, prazoMes, resolverPessoa, sugerirVinculos,
  type LeituraPlanilha,
} from './importador'
import { deWorkbook, lerXlsx, modeloMetas } from './planilhaXlsx'

const D = (iso: string) => new Date(`${iso}T00:00:00`) // meia-noite local, como o SheetJS devolve

/** Planilha com a mesma estrutura da fatura real de dezembro/2026 (valores iguais). */
function planilhaDezembro(opcoes: { parcelaComoData?: boolean } = {}): WorkBook {
  const wb = utils.book_new()
  const aba = (nome: string, rows: unknown[][]) => utils.book_append_sheet(wb, utils.aoa_to_sheet(rows), nome)
  aba('Resumo', [
    ['Fatura de Dezembro'],
    ['Itaú Platinum · final 7142 · em aberto · fecha 02/12 · vence 09/12/2026'],
    ['Categoria', null, 'Valor', null, 'Item', null, 'Valor'],
    ['Vestuário', null, 169.92, null, 'Renda', null, 1],
  ])
  const parc = (p: string) => (opcoes.parcelaComoData ? D(`2026-${p.split('/')[1]!.padStart(2, '0')}-${p.split('/')[0]!.padStart(2, '0')}`) : p)
  aba('Lançamentos', [
    ['Lançamentos'],
    ['Fatura de Dezembro/2026 · em aberto · extrato do app em 03/11/2026 (por enquanto só parcelas)'],
    ['TOTAL ATÉ AGORA', null, 'Nº DE LANÇAMENTOS', null, 'MAIOR LANÇAMENTO'],
    [2382.11, null, 18, null, 485.33],
    ['Data', 'Estabelecimento', 'Categoria', 'Cidade', 'Parcela', 'Valor'],
    [D('2026-10-17'), 'C&A', 'Vestuário', 'Maceió', parc('2/2'), 69.99],
    [D('2026-10-17'), 'LOJAS RENNER', 'Vestuário', 'Maceió', parc('2/2'), 59.95],
    [D('2026-10-17'), 'ALMEIDA REFRIGERACAO', 'Serviços', 'Maceió', parc('2/5'), 92.48],
    [D('2026-10-14'), 'ADRY EMPREENDEDOR', 'Outros', 'Maceió', parc('2/6'), 283.33],
    [D('2026-10-05'), 'MERCADOLIVRE', 'Outros', 'Osasco', parc('2/2'), 149.57],
    [D('2026-10-02'), 'JIM.COM* JOSENILDO', 'Serviços', 'União dos Palmares', parc('2/10'), 157.41],
    [D('2026-09-20'), 'PATRICIA VAZ DA COSTA', 'Outros', 'Palmeira dos Índios', parc('3/3'), 110.33],
    [D('2026-09-05'), 'KIKO COSMETICS BRASIL', 'Outros', 'São Paulo', parc('3/3'), 149.93],
    [D('2026-07-27'), 'YOUCOM', 'Vestuário', 'Maceió', parc('5/5'), 39.98],
    [D('2026-07-13'), 'MARCO SANTONIO', 'Serviços', 'Maceió', parc('5/6'), 485.33],
    [D('2026-06-05'), 'MERCADOLIVRE', 'Outros', 'Osasco', parc('6/10'), 233.9],
    [D('2026-05-23'), 'CASA ESPORTIVA', 'Outros', 'Maceió', parc('7/10'), 54.99],
    [D('2026-11-02'), 'UBER', 'Transporte', 'Maceió', null, 5.9],
    [D('2026-11-02'), 'OUTBACK', 'Alimentação', 'Maceió', null, 30.93],
    [D('2026-11-02'), 'UBER', 'Transporte', 'Maceió', null, 18.95],
    [D('2026-11-02'), 'SUSHI GUGA', 'Alimentação', 'Maceió', null, 55.84],
    [D('2026-11-05'), 'WELLHUB', 'Assinaturas', 'Maceió', null, 183.3],
    [D('2026-11-05'), 'ZP LOJA RULINA CLOSET (CONSERTO DO AR)', 'Serviços', 'Maceió', parc('1/3'), 200],
    [D('2026-11-09'), 'PAGAMENTO FATURA ANTERIOR', null, null, null, -5992.99],
    [null, 'Total', null, null, null, 2382.11],
    ['Compras novas: lance nas linhas em branco abaixo. No valor, digite só o número (ex.: 30,93), sem "R$". A parcela fica como texto (ex.: 1/3).'],
  ])
  aba('Quem me deve', [
    ['Quem me deve'],
    ['Repasses da fatura de Dezembro · mude o status para "Pago" quando receber'],
    ['JOSÉ VALTER ME DEVE', null, 'ELIJANI ME DEVE', null, 'AINDA FALTA RECEBER'],
    [1487.86, null, 149, null, 1636.86],
    ['José Valter'],
    ['Data', 'Descrição', 'Valor', 'Origem', 'Status'],
    [D('2026-05-23'), 'Meu presente de aniversario', 70, 'CASA ESPORTIVA - 07/10', 'Pendente'],
    [D('2026-06-05'), 'TV', 116.45, 'MERCADO LIVRE - 06/10', 'Pendente'],
    [D('2026-07-13'), 'CARRO', 485.33, 'MARCO SANTONIO - 05/06', 'Pendente'],
    [D('2026-09-20'), 'PATRICIA VAZ DA COSTA (parc. 3/3 - final)', 110.33, 'Fatura Dez - final', 'Pendente'],
    [D('2026-10-17'), 'CEA MCO 440 (parc. 2/2 - final)', 69.99, 'Aniversário do Julio', 'Pendente'],
    [D('2026-10-17'), 'LOJAS RENNER FL 96 (parc. 2/2 - final)', 59.95, 'Aniversário do Julio', 'Pendente'],
    [D('2026-10-17'), 'ZP*ALMEIDA REFRIGERACAO (parc. 2/5)', 92.48, 'Fatura Dez - parc. 2/5', 'Pendente'],
    [D('2026-10-14'), 'ADRYEMPREENDEDOR (parc. 2/6)', 283.33, 'Fatura Dez - parc. 2/6', 'Pendente'],
    [D('2026-11-05'), 'ZP LOJA RULINA CLOSET (CONSERTO DO AR)', 200, 'Fatura Dez - parc. 1/3', 'Pendente'],
    [null, 'Total', 1487.86, 'falta receber', 1487.86],
    ['Elijani'],
    ['Data', 'Descrição', 'Valor', 'Origem', 'Status'],
    [null, 'sthe - kiko milano (parc. 3/3 - final)', 149, 'KIKO - 03/03', 'Pendente'],
    [null, 'Total', 149, 'falta receber', 149],
    ['Minha parte da fatura'],
    [null, 'Item', 'Valor'],
    [null, 'Total da fatura', 2382.11],
    [null, '(-) José Valter', -1487.86],
    [null, '(-) Elijani', -149],
    [null, 'Eu pago', 745.25],
  ])
  aba('Minhas despesas', [
    ['Meu mês'],
    ['Dezembro/2026 · renda, contas fora do cartão e quanto sobra'],
    ['Fluxo do mês'],
    ['Item', null, 'Valor'],
    ['Renda do mês', null, 6400],
    ['(-) Minha parte da fatura', null, -745.25],
    ['Contas fora do cartão'],
    ['Conta', 'Descrição', 'Valor', 'Fixa?', 'Status'],
    ['CLARO - DADOS MOVEIS', 'Plano de internet para o celular', 61.16, 'sim', 'Pendente'],
    ['BRISANET - INTERNET', 'Plano de internet pra casa', 100, 'sim', 'Pendente'],
    ['DAS - MEI', 'Imposto do MEI', 99, 'sim', 'Pendente'],
    ['Celular da mainha', '(6/10) parcelas', 53.3, 'não', 'Pendente'],
    ['Empréstimo energia solar', null, 490, 'sim', 'Pendente'],
    ['Casa do aniversario da mainha', '(2/3)', 193.23, 'não', 'Pendente'],
    [null, 'Total', 996.69],
    ['Quem eu devo'],
    ['Pessoa', 'Descrição', 'Valor', 'Observação', 'Status'],
    ['Elijani', 'Ingresso do show', 180, null, 'Pendente'],
    ['José Valter', 'Gasolina', 50, null, 'Pago'],
    [null, 'Total', 230],
  ])
  return wb
}

const cents = (r: number) => Math.round(r * 100)

describe('lerPlanilha: lançamentos', () => {
  const l = lerPlanilha(deWorkbook(planilhaDezembro()))

  it('acha o mês no título da aba', () => {
    expect(l.mes_detectado).toBe('2026-12')
  })
  it('lê os 18 lançamentos e ignora total e pagamento da fatura anterior', () => {
    expect(l.lancamentos).toHaveLength(18)
    expect(somar(l.lancamentos, (x) => x.valor_centavos)).toBe(cents(2382.11))
    expect(l.lancamentos.some((x) => /pagamento|total/i.test(x.descricao))).toBe(false)
  })
  it('normaliza data, parcela e categoria', () => {
    expect(l.lancamentos[0]).toEqual({
      data_compra: '2026-10-17', descricao: 'C&A', valor_centavos: 6999, parcela: '02/02', categoria: 'Vestuário', dono_nome: null,
    })
    expect(l.lancamentos.find((x) => x.descricao === 'UBER')).toMatchObject({ parcela: null, categoria: 'Transporte' })
  })
  it('trata parcela que o Excel converteu em data', () => {
    const c = lerPlanilha(deWorkbook(planilhaDezembro({ parcelaComoData: true })))
    expect(c.lancamentos.map((x) => x.parcela)).toEqual(l.lancamentos.map((x) => x.parcela))
  })
  it('renda vem de "Minhas despesas", não do "Resumo"', () => {
    expect(l.renda_centavos).toBe(640000)
  })
})

describe('lerPlanilha: dívidas e contas', () => {
  const l = lerPlanilha(deWorkbook(planilhaDezembro()))
  const meDeve = l.dividas.filter((d) => d.direcao === 'me_deve')

  it('lê os blocos por pessoa', () => {
    expect(meDeve.filter((d) => d.pessoa_nome === 'José Valter')).toHaveLength(9)
    expect(somar(meDeve.filter((d) => d.pessoa_nome === 'José Valter'), (d) => d.valor_centavos)).toBe(cents(1487.86))
    expect(meDeve.filter((d) => d.pessoa_nome === 'Elijani').map((d) => d.valor_centavos)).toEqual([14900])
  })
  it('não importa "Eu pago" do bloco Minha parte da fatura (bug do protótipo)', () => {
    expect(l.dividas.some((d) => /eu pago|total da fatura/i.test(d.descricao))).toBe(false)
    expect(somar(meDeve, (d) => d.valor_centavos)).toBe(cents(1636.86))
  })
  it('acha a parcela de origem na descrição ou na coluna Origem', () => {
    expect(meDeve.map((d) => d.parcela)).toEqual(['07/10', '06/10', '05/06', '03/03', '02/02', '02/02', '02/05', '02/06', '01/03', '03/03'])
  })
  it('lê "Quem eu devo" com a pessoa de cada linha e o status', () => {
    expect(l.dividas.filter((d) => d.direcao === 'eu_devo')).toEqual([
      expect.objectContaining({ pessoa_nome: 'Elijani', descricao: 'Ingresso do show', valor_centavos: 18000, recebido: false }),
      expect.objectContaining({ pessoa_nome: 'José Valter', descricao: 'Gasolina', valor_centavos: 5000, recebido: true }),
    ])
  })
  it('lê as contas fora do cartão marcando as fixas', () => {
    expect(l.contas.map((c) => [c.nome, c.valor_centavos, c.fixa])).toEqual([
      ['CLARO - DADOS MOVEIS', 6116, true],
      ['BRISANET - INTERNET', 10000, true],
      ['DAS - MEI', 9900, true],
      ['Celular da mainha', 5330, false],
      ['Empréstimo energia solar', 49000, true],
      ['Casa do aniversario da mainha', 19323, false],
    ])
  })
})

describe('vincular dívidas às compras', () => {
  const l = lerPlanilha(deWorkbook(planilhaDezembro()))
  const v = sugerirVinculos(l)
  const desc = (i: number | null) => (i === null ? null : l.lancamentos[i]!.descricao)

  it('acha a compra de cada dívida', () => {
    expect(v.map((x) => [l.dividas[x.divida]!.descricao, desc(x.lancamento), x.tipo, x.sugerida])).toEqual([
      ['Meu presente de aniversario', 'CASA ESPORTIVA', 'diferente', 'inteira'],
      ['TV', 'MERCADOLIVRE', 'diferente', 'dividir'],
      ['CARRO', 'MARCO SANTONIO', 'exato', 'inteira'],
      ['PATRICIA VAZ DA COSTA (parc. 3/3 - final)', 'PATRICIA VAZ DA COSTA', 'exato', 'inteira'],
      ['CEA MCO 440 (parc. 2/2 - final)', 'C&A', 'exato', 'inteira'],
      ['LOJAS RENNER FL 96 (parc. 2/2 - final)', 'LOJAS RENNER', 'exato', 'inteira'],
      ['ZP*ALMEIDA REFRIGERACAO (parc. 2/5)', 'ALMEIDA REFRIGERACAO', 'exato', 'inteira'],
      ['ADRYEMPREENDEDOR (parc. 2/6)', 'ADRY EMPREENDEDOR', 'exato', 'inteira'],
      ['ZP LOJA RULINA CLOSET (CONSERTO DO AR)', 'ZP LOJA RULINA CLOSET (CONSERTO DO AR)', 'exato', 'inteira'],
      ['sthe - kiko milano (parc. 3/3 - final)', 'KIKO COSMETICS BRASIL', 'diferente', 'dividir'],
    ])
  })
  it('a TV pega o MERCADOLIVRE de 06/10, não o de 02/02', () => {
    expect(l.lancamentos[v[1]!.lancamento!]!.parcela).toBe('06/10')
  })

  const painho = pessoa({ id: 'pai', nome: 'Painho', apelidos: ['José Valter'] })
  const sthe = pessoa({ id: 'sthe', nome: 'Sthe', apelidos: ['Elijani'] })
  const pessoaId = (n: string) => resolverPessoa(n, [painho, sthe])?.id ?? null

  it('com as sugestões, os totais batem com a planilha (eu pago R$ 745,25)', () => {
    const m = montarImportacao({ leitura: l, mes: '2026-12', vinculos: v, pessoaId })
    const total = somar(m.lancamentos, (x) => x.valor_centavos)
    const meu = somar(m.lancamentos.filter((x) => x.dono === 'eu'), (x) => x.valor_centavos)
    const avulsasPai = m.dividas.filter((d) => d.pessoa_id === 'pai' && d.direcao === 'me_deve')
    expect(total).toBe(cents(2382.11))
    // A planilha desconta os R$ 70 do presente, mas no cartão a compra é R$ 54,99: a diferença (15,01)
    // vira dívida avulsa do Painho. Minha parte no cartão − essa diferença = "Eu pago" da planilha.
    expect(meu - 1501).toBe(cents(745.25))
    expect(avulsasPai).toEqual([expect.objectContaining({ descricao: 'Meu presente de aniversario (diferença)', valor_centavos: 1501 })])
    // Painho: compras no cartão + diferença avulsa = 1.487,86, igual à planilha
    const doPai = somar(m.lancamentos.filter((x) => x.dono === 'pai'), (x) => x.valor_centavos) + somar(avulsasPai, (d) => d.valor_centavos)
    expect(doPai).toBe(cents(1487.86))
    expect(somar(m.lancamentos.filter((x) => x.dono === 'sthe'), (x) => x.valor_centavos)).toBe(14900)
    expect(m.lancamentos).toHaveLength(20) // 18 + TV e Kiko divididas
  })

  it('"Eu devo" vira dívida eu_devo, nunca mexe nas compras', () => {
    const m = montarImportacao({ leitura: l, mes: '2026-12', vinculos: v, pessoaId })
    expect(m.dividas.filter((d) => d.direcao === 'eu_devo').map((d) => [d.pessoa_id, d.valor_centavos, d.recebido])).toEqual([
      ['sthe', 18000, false],
      ['pai', 5000, true],
    ])
  })

  it('decisões da prévia trocam a sugestão', () => {
    const kiko = v.findIndex((x) => /kiko/.test(l.dividas[x.divida]!.descricao))
    const tv = v.findIndex((x) => l.dividas[x.divida]!.descricao === 'TV')
    const m = montarImportacao({
      leitura: l, mes: '2026-12', vinculos: v, pessoaId,
      decisoes: { [v[kiko]!.divida]: 'inteira', [v[tv]!.divida]: 'avulsa' },
    })
    expect(m.lancamentos.find((x) => x.descricao === 'KIKO COSMETICS BRASIL')).toMatchObject({ dono: 'sthe', valor_centavos: 14993 })
    expect(m.lancamentos.filter((x) => x.parcela === '06/10')).toEqual([expect.objectContaining({ dono: 'eu', valor_centavos: 23390 })])
    expect(m.dividas.some((d) => d.descricao === 'TV' && d.valor_centavos === 11645)).toBe(true)
  })

  it('pessoa sem correspondência (null) é ignorada', () => {
    const m = montarImportacao({ leitura: l, mes: '2026-12', vinculos: v, pessoaId: () => null })
    expect(m.dividas).toEqual([])
    expect(m.lancamentos.every((x) => x.dono === 'eu')).toBe(true)
  })

  it('cria só as contas escolhidas, com dia 10', () => {
    const m = montarImportacao({ leitura: l, mes: '2026-12', vinculos: v, pessoaId, contas: [0, 4] })
    expect(m.contas).toEqual([
      { nome: 'CLARO - DADOS MOVEIS', valor_centavos: 6116, dia: 10, ativa: true },
      { nome: 'Empréstimo energia solar', valor_centavos: 49000, dia: 10, ativa: true },
    ])
  })
})

describe('metas', () => {
  function comMetas(): WorkBook {
    const wb = planilhaDezembro()
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Metas e reserva'],
      ['Ícone', 'Meta', 'Alvo', 'Guardado', 'Por mês', 'Prazo', 'Dia'],
      ['reserva', 'Reserva de emergência', 11000, 2400, 700, D('2027-10-01'), 10],
      [null, 'Entrada do apartamento', 'R$ 40.000,00', '3.500,00', '600', '12/2028', null],
      ['corrida', 'Viagem Recife 2027', 2500, 450, 250, 'mai/2027', 5],
      [null, 'Ideia sem valor', null, null, null, null, null],
      [null, 'Total', 53500, 6350, 1550],
    ]), 'Metas')
    return wb
  }
  const l = lerPlanilha(deWorkbook(comMetas()))

  it('lê a aba de metas com prazo em vários formatos', () => {
    expect(l.metas).toEqual([
      { emoji: 'reserva', nome: 'Reserva de emergência', alvo_centavos: 1100000, atual_centavos: 240000, mensal_centavos: 70000, prazo: '2027-10', dia: 10 },
      { emoji: null, nome: 'Entrada do apartamento', alvo_centavos: 4000000, atual_centavos: 350000, mensal_centavos: 60000, prazo: '2028-12', dia: null },
      { emoji: null, nome: 'Viagem Recife 2027', alvo_centavos: 250000, atual_centavos: 45000, mensal_centavos: 25000, prazo: '2027-05', dia: 5 },
    ])
  })
  it('metas não atrapalham o resto da leitura', () => {
    expect(l.lancamentos).toHaveLength(18)
    expect(l.contas).toHaveLength(6)
    expect(l.dividas.filter((d) => d.direcao === 'me_deve')).toHaveLength(10)
  })
  it('seção "Metas" dentro de Minhas despesas também vale', () => {
    const wb = utils.book_new()
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['Contas fora do cartão'],
      ['Conta', 'Descrição', 'Valor', 'Fixa?'],
      ['Luz', null, 170, 'sim'],
      ['Metas'],
      ['Nome', 'Quanto quer juntar', 'Já tenho', 'Mensal'],
      ['Notebook', 6000, 1000, 500],
    ]), 'Minhas despesas')
    const x = lerPlanilha(deWorkbook(wb))
    expect(x.contas.map((c) => c.nome)).toEqual(['Luz'])
    expect(x.metas).toEqual([expect.objectContaining({ nome: 'Notebook', alvo_centavos: 600000, atual_centavos: 100000, mensal_centavos: 50000 })])
  })
  it('a planilha de dezembro não tem metas', () => {
    expect(lerPlanilha(deWorkbook(planilhaDezembro())).metas).toEqual([])
  })
  it('monta metas novas e atualiza as que já existem pelo nome', () => {
    const existente = meta({ id: 'm1', nome: 'RESERVA DE EMERGENCIA', emoji: 'cofre', atual_centavos: 100000, dia: 15, prazo: '2027-12' })
    const m = montarImportacao({
      leitura: l, mes: '2026-12', vinculos: [], pessoaId: () => null, metas: [0, 2], metasExistentes: [existente],
    })
    expect(m.metas.atualizar).toEqual([
      { ...existente, nome: 'Reserva de emergência', alvo_centavos: 1100000, atual_centavos: 240000, mensal_centavos: 70000, prazo: '2027-10', emoji: 'reserva', dia: 10 },
    ])
    expect(m.metas.novas).toEqual([
      { nome: 'Viagem Recife 2027', alvo_centavos: 250000, atual_centavos: 45000, mensal_centavos: 25000, prazo: '2027-05', emoji: 'alvo', dia: 5 },
    ])
  })
  it('o modelo para baixar é lido de volta pelo importador', () => {
    const x = lerPlanilha(lerXlsx(new Uint8Array(modeloMetas())))
    expect(x.metas.map((m) => [m.nome, m.alvo_centavos, m.prazo])).toEqual([
      ['Reserva de emergência', 1100000, '2027-10'],
      ['Entrada do apartamento', 4000000, '2028-12'],
    ])
  })
  it('prazoMes', () => {
    expect(prazoMes('10/2027')).toBe('2027-10')
    expect(prazoMes('out/2027')).toBe('2027-10')
    expect(prazoMes('Outubro de 2027')).toBe('2027-10')
    expect(prazoMes('dez 28')).toBe('2028-12')
    expect(prazoMes('2027-03')).toBe('2027-03')
    expect(prazoMes(D('2027-03-15'))).toBe('2027-03')
    expect(prazoMes('sem prazo')).toBeNull()
    expect(prazoMes('13/2027')).toBeNull()
  })
})

describe('auxiliares', () => {
  it('resolverPessoa por nome, apelido e palavra', () => {
    const ps = [pessoa({ id: 'pai', nome: 'Painho', apelidos: ['José Valter'] }), pessoa({ id: 's', nome: 'Sthe' })]
    expect(resolverPessoa('JOSE VALTER', ps)?.id).toBe('pai')
    expect(resolverPessoa('painho', ps)?.id).toBe('pai')
    expect(resolverPessoa('Sthe Elijani', ps)?.id).toBe('s')
    expect(resolverPessoa('Fulano', ps)).toBeNull()
    expect(resolverPessoa('Esthefany', ps)).toBeNull() // "sthe" só como palavra inteira
  })
  it('mesNoTexto', () => {
    expect(mesNoTexto('Fatura de Dezembro/2026 · em aberto')).toBe('2026-12')
    expect(mesNoTexto('fatura de março de 2027')).toBe('2027-03')
    expect(mesNoTexto('Fatura Itau Dezembro2026 (4) xlsx')).toBe('2026-12')
    expect(mesNoTexto('sem mês')).toBeNull()
  })
  it('parcelaDoTexto', () => {
    expect(parcelaDoTexto('CEA MCO 440 (parc. 2/2 - final)')).toBe('02/02')
    expect(parcelaDoTexto('CASA ESPORTIVA - 07/10')).toBe('07/10')
    expect(parcelaDoTexto('Fatura Dez - parc. 1/3')).toBe('01/03')
    expect(parcelaDoTexto('(6/10) parcelas')).toBe('06/10')
    expect(parcelaDoTexto('Meu presente')).toBeNull()
  })
  it('dataISO aceita Date, série do Excel e dd/mm', () => {
    expect(dataISO(D('2026-10-17'), '2026-12')).toBe('2026-10-17')
    expect(dataISO(new Date(Date.UTC(2026, 9, 17)), '2026-12')).toBe('2026-10-17')
    expect(dataISO(46312, null)).toBe('2026-10-17')
    expect(dataISO('17/10', '2026-12')).toBe('2026-10-17')
    expect(dataISO('17/12', '2027-01')).toBe('2026-12-17')
    expect(dataISO('17/10/25', null)).toBe('2025-10-17')
    expect(dataISO('xx', null)).toBeNull()
  })
  it('planilha sem cabeçalho gera aviso', () => {
    const wb = utils.book_new()
    utils.book_append_sheet(wb, utils.aoa_to_sheet([['nada aqui']]), 'Lançamentos')
    const l: LeituraPlanilha = lerPlanilha(deWorkbook(wb))
    expect(l.lancamentos).toEqual([])
    expect(l.avisos[0]).toMatch(/cabeçalho/)
  })
})

// Roda só na máquina que tem a planilha real (referencia/ não vai para o git).
const REAL = resolve(import.meta.dirname, '../../referencia/Fatura_Itau_Dezembro2026 (4).xlsx')
describe.skipIf(!existsSync(REAL))('planilha real de dezembro/2026', () => {
  it('importa com os mesmos totais da planilha', () => {
    const l = lerPlanilha(lerXlsx(readFileSync(REAL)), 'Fatura_Itau_Dezembro2026 (4).xlsx')
    expect(l.mes_detectado).toBe('2026-12')
    expect(l.renda_centavos).toBe(640000)
    expect(l.lancamentos).toHaveLength(18)
    expect(somar(l.lancamentos, (x) => x.valor_centavos)).toBe(cents(2382.11))
    expect(somar(l.dividas.filter((d) => d.direcao === 'me_deve'), (d) => d.valor_centavos)).toBe(cents(1636.86))
    expect(l.contas.filter((c) => c.fixa)).toHaveLength(4)
    expect(l.metas).toEqual([])
    const ps = [pessoa({ id: 'pai', nome: 'Painho', apelidos: ['José Valter'] }), pessoa({ id: 'sthe', nome: 'Sthe', apelidos: ['Elijani'] })]
    const m = montarImportacao({ leitura: l, mes: '2026-12', vinculos: sugerirVinculos(l), pessoaId: (n) => resolverPessoa(n, ps)?.id ?? null })
    const meu = somar(m.lancamentos.filter((x) => x.dono === 'eu'), (x) => x.valor_centavos)
    // "Eu pago" da planilha = minha parte no cartão − diferença do presente (avulsa)
    expect(meu - 1501).toBe(cents(745.25))
  })
})
