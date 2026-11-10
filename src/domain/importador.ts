// Importação da planilha mensal (.xlsx). Porte do `analisar()` do protótipo, com correções:
//  * lê cada aba por SEÇÕES (linha de título + linha de cabeçalho), em vez de adivinhar a descrição
//    pelo texto mais longo; assim o bloco "Minha parte da fatura" não vira dívida de ninguém;
//  * prefere a aba "Minhas despesas" à "Resumo" para achar a renda;
//  * nomes das pessoas são resolvidos pelo cadastro (nome e apelidos), nada fixo no código;
//  * as dívidas da aba "Quem me deve" que vieram de compras do cartão são LIGADAS a essas compras
//    (o dono da compra passa a ser a pessoa), para não contar o mesmo valor duas vezes.
// Tudo aqui é puro: recebe as linhas já lidas (planilhaXlsx.ts) e devolve dados; quem grava é a tela.
// Não importa o SheetJS, para ele só ser baixado quando alguém abrir a importação.
import { CATEGORIAS, categoria, normalizar } from './categoria'
import { parseValor } from './dinheiro'
import { iconeMeta, ICONE_META_PADRAO, ICONES_META } from './icones'
import { MESES } from './meses'
import { lerParcela, normalizarParcela, parcelaNaDescricao } from './parcelas'
import {
  EU, type Centavos, type ContaFixa, type DirecaoDivida, type Divida, type Lancamento, type Mes, type Meta, type Pessoa,
} from './tipos'

export type Celula = string | number | boolean | Date | null
export type Linha = Celula[]

/** A planilha já lida: abas na ordem do arquivo, cada uma como linhas de células. */
export interface Planilha {
  abas: { nome: string; linhas: Linha[] }[]
}

export interface LancamentoLido {
  data_compra: string | null
  descricao: string
  valor_centavos: Centavos
  parcela: string | null
  categoria: string
  /** Nome escrito numa coluna "Quem/Dono", se a planilha tiver. */
  dono_nome: string | null
}

export interface DividaLida {
  /** Nome como está na planilha (título do bloco ou coluna Pessoa). */
  pessoa_nome: string
  descricao: string
  origem: string | null
  valor_centavos: Centavos
  recebido: boolean
  direcao: DirecaoDivida
  /** Parcela da compra de origem, se der para achar no texto. */
  parcela: string | null
}

export interface ContaLida {
  nome: string
  descricao: string | null
  valor_centavos: Centavos
  fixa: boolean
}

export interface MetaLida {
  emoji: string | null
  nome: string
  alvo_centavos: Centavos
  atual_centavos: Centavos
  mensal_centavos: Centavos
  prazo: Mes | null
  dia: number | null
}

export interface LeituraPlanilha {
  mes_detectado: Mes | null
  renda_centavos: Centavos | null
  lancamentos: LancamentoLido[]
  dividas: DividaLida[]
  contas: ContaLida[]
  metas: MetaLida[]
  avisos: string[]
}

// ---------- utilidades de leitura ----------

function linhasDa(p: Planilha, nome: string | undefined): Linha[] {
  return p.abas.find((a) => a.nome === nome)?.linhas ?? []
}

function acharAba(p: Planilha, re: RegExp): string | undefined {
  return p.abas.find((a) => re.test(normalizar(a.nome)))?.nome
}

const preenchidas = (r: Linha) => r.filter((c) => c !== null && String(c).trim() !== '')
const ehTexto = (c: Celula): c is string => typeof c === 'string' && c.trim() !== ''

/** Linha de título: um único texto curto, sem números. Ex.: "José Valter", "Quem eu devo". */
function ehTitulo(r: Linha): string | null {
  const p = preenchidas(r)
  return p.length === 1 && ehTexto(p[0]!) && p[0].trim().length <= 60 ? p[0].trim() : null
}

/** Linha de cabeçalho: só textos, com uma coluna de valor ("Valor", ou "Alvo"/"Guardado" nas metas). */
function ehCabecalho(r: Linha): boolean {
  const p = preenchidas(r)
  return p.length >= 2 && p.every(ehTexto) && r.some((c) => ehTexto(c) && /^valor|alvo|guardado|^mensal|por mes/.test(normalizar(c)))
}

interface Secao {
  titulo: string | null
  cabecalho: string[]
  dados: Linha[]
}

/** Quebra uma aba em seções: título (opcional) + cabeçalho + linhas de dados até a próxima seção. */
function secoes(rows: Linha[]): Secao[] {
  const out: Secao[] = []
  let titulo: string | null = null
  let atual: Secao | null = null
  for (const r of rows) {
    const t = ehTitulo(r)
    if (t !== null) {
      titulo = t
      atual = null
      continue
    }
    if (ehCabecalho(r)) {
      atual = { titulo, cabecalho: r.map((c) => (ehTexto(c) ? normalizar(c) : '')), dados: [] }
      out.push(atual)
      titulo = null
      continue
    }
    atual?.dados.push(r)
  }
  return out
}

function coluna(cab: string[], re: RegExp, ignorar: number[] = []): number | null {
  const i = cab.findIndex((c, j) => !ignorar.includes(j) && re.test(c))
  return i >= 0 ? i : null
}

const celula = (r: Linha, i: number | null): Celula => (i === null ? null : (r[i] ?? null))
const texto = (c: Celula) => (c === null ? '' : c instanceof Date ? '' : String(c).trim())

const RE_TOTAL = /^(sub)?total|^soma|falta receber/

// ---------- datas ----------

/** Data da planilha para 'YYYY-MM-DD'. Aceita Date, número de série do Excel e "dd/mm(/aa)". */
export function dataISO(v: Celula, mesFatura: Mes | null): string | null {
  const iso = (d: Date) => {
    const x = new Date(d.getTime() + 12 * 3600e3) // meia-noite local ou UTC caem no mesmo dia
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : iso(v)
  if (typeof v === 'number' && v > 20000 && v < 80000) return iso(new Date(Date.UTC(1899, 11, 30) + v * 86400e3))
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(texto(v))
  if (!m) return null
  const dia = +m[1]!
  const mes = +m[2]!
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null
  let ano: number
  if (m[3]) ano = +m[3] < 100 ? 2000 + +m[3] : +m[3]
  else {
    const [ya, ma] = (mesFatura ?? '2000-01').split('-').map(Number) as [number, number]
    ano = mes > ma ? ya - 1 : ya
  }
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// ---------- mês e renda ----------

const RE_MES_ANO = new RegExp(`(${MESES.map((m) => normalizar(m)).join('|')})\\s*(?:\\/|de\\s+)?\\s*(\\d{4})`)

/** Procura "Dezembro/2026", "dezembro de 2026" ou "Dezembro2026" num texto. */
export function mesNoTexto(s: string): Mes | null {
  const m = RE_MES_ANO.exec(normalizar(s))
  if (!m) return null
  const idx = MESES.findIndex((x) => normalizar(x) === m[1])
  return `${m[2]}-${String(idx + 1).padStart(2, '0')}`
}

function detectarMes(wb: Planilha, nomeArquivo?: string): Mes | null {
  const ordem = [acharAba(wb, /lancamento/), ...wb.abas.map((a) => a.nome)].filter((n): n is string => !!n)
  for (const nome of ordem) {
    for (const r of linhasDa(wb, nome).slice(0, 6)) {
      for (const c of r) if (ehTexto(c)) {
        const m = mesNoTexto(c)
        if (m) return m
      }
    }
  }
  return nomeArquivo ? mesNoTexto(nomeArquivo.replace(/[_.-]/g, ' ')) : null
}

function detectarRenda(wb: Planilha): Centavos | null {
  const ordem = [acharAba(wb, /minhas despesas|meu mes/), acharAba(wb, /resumo/)].filter((n): n is string => !!n)
  for (const nome of ordem) {
    for (const r of linhasDa(wb, nome)) {
      const i = r.findIndex((c) => ehTexto(c) && /^(renda|salario)/.test(normalizar(c)))
      if (i < 0) continue
      const n = r.slice(i + 1).find((c): c is number => typeof c === 'number' && c > 0)
      if (n) return Math.round(n * 100)
    }
  }
  return null
}

// ---------- lançamentos ----------

function categoriaLida(valor: Celula, desc: string): string {
  const t = texto(valor)
  if (!t) return categoria(desc)
  return CATEGORIAS.find((c) => normalizar(c.nome) === normalizar(t))?.nome ?? t
}

function lerLancamentos(wb: Planilha, mes: Mes | null, avisos: string[]): LancamentoLido[] {
  // Sem aba "Lançamentos", procura em qualquer aba uma tabela Data | … | Valor (planilha só de metas não avisa nada).
  const abaNomeada = acharAba(wb, /lancamento/)
  const temData = (s: Secao) => s.cabecalho.some((c) => /^data/.test(c)) && s.cabecalho.some((c) => /descri|estabelec/.test(c))
  const nome = abaNomeada ?? wb.abas.find((a) => secoes(a.linhas).some(temData))?.nome
  if (!nome) return []
  const sec = secoes(linhasDa(wb, nome)).find(temData)
  if (!sec) {
    avisos.push(`Não achei o cabeçalho (Data, Descrição, Valor) na aba “${nome}”.`)
    return []
  }
  const cab = sec.cabecalho
  const cData = coluna(cab, /^data/)
  const cDesc = coluna(cab, /descri|estabelec|lancamento|^nome|^historico/)
  const cCat = coluna(cab, /categ/)
  const cParc = coluna(cab, /parcela/)
  const cValor = coluna(cab, /^valor/)
  const cDono = coluna(cab, /quem|dono|respons|de quem/)
  const out: LancamentoLido[] = []
  for (const r of sec.dados) {
    const descricao = texto(celula(r, cDesc))
    const valor = parseValor(celula(r, cValor))
    if (!descricao || valor === null || valor === 0) continue
    const nd = normalizar(descricao)
    if (RE_TOTAL.test(nd)) continue
    if (valor < 0 && /pagamento|pgto/.test(nd)) continue // pagamento da fatura anterior
    const dono = texto(celula(r, cDono))
    out.push({
      data_compra: dataISO(celula(r, cData), mes),
      descricao,
      valor_centavos: valor,
      parcela: normalizarParcela(celula(r, cParc)) ?? parcelaNaDescricao(descricao),
      categoria: categoriaLida(celula(r, cCat), descricao),
      dono_nome: dono && !/^(eu|meu|minha)$/.test(normalizar(dono)) ? dono : null,
    })
  }
  if (!out.length) avisos.push(`A aba “${nome}” não tem lançamentos com valor.`)
  return out
}

// ---------- dívidas e contas ----------

/** Parcela citada no texto da dívida: "(parc. 2/5)", "CASA ESPORTIVA - 07/10". */
export function parcelaDoTexto(s: string): string | null {
  const m = /parc\w*\.?\s*(\d{1,2}\s*\/\s*\d{1,2})/i.exec(s) ?? /-\s*(\d{1,2}\s*\/\s*\d{1,2})\b/.exec(s) ?? /\((\d{1,2}\s*\/\s*\d{1,2})\)/.exec(s)
  return m ? normalizarParcela(m[1]!.replace(/\s/g, '')) : null
}

const RE_PAGO = /\b(pago|paga|recebido|quitado|quitada|ok)\b/

function lerDividasDaSecao(sec: Secao, direcao: DirecaoDivida, pessoaDoBloco: string | null): DividaLida[] {
  const cab = sec.cabecalho
  const cDesc = coluna(cab, /descri|item/)
  const cValor = coluna(cab, /^valor/)
  const cOrigem = coluna(cab, /origem|observ/)
  const cStatus = coluna(cab, /status|situa/)
  const cPessoa = coluna(cab, /^pessoa|^quem|^nome/)
  const out: DividaLida[] = []
  for (const r of sec.dados) {
    const descricao = texto(celula(r, cDesc))
    const valor = parseValor(celula(r, cValor))
    if (!descricao || valor === null || valor <= 0 || RE_TOTAL.test(normalizar(descricao))) continue
    const pessoa = texto(celula(r, cPessoa)) || pessoaDoBloco
    if (!pessoa) continue
    const origem = texto(celula(r, cOrigem)) || null
    out.push({
      pessoa_nome: pessoa,
      descricao,
      origem,
      valor_centavos: valor,
      recebido: RE_PAGO.test(normalizar(texto(celula(r, cStatus)))),
      direcao,
      parcela: parcelaDoTexto(descricao) ?? (origem ? parcelaDoTexto(origem) : null),
    })
  }
  return out
}

function lerDividasEContas(wb: Planilha, avisos: string[]): { dividas: DividaLida[]; contas: ContaLida[] } {
  const dividas: DividaLida[] = []
  const contas: ContaLida[] = []
  const abaDeve = acharAba(wb, /divida|me deve|quem deve/)
  for (const nome of wb.abas.map((a) => a.nome)) {
    if (/lancamento|categoria|parcelas futuras|info da fatura|resumo/.test(normalizar(nome))) continue
    for (const sec of secoes(linhasDa(wb, nome))) {
      const tit = normalizar(sec.titulo ?? '')
      const temDesc = sec.cabecalho.some((c) => /descri/.test(c))
      if (/eu devo/.test(tit)) {
        dividas.push(...lerDividasDaSecao(sec, 'eu_devo', null))
      } else if (/contas? (fora|fixa|do mes)/.test(tit) && sec.cabecalho.some((c) => /^conta/.test(c))) {
        const cab = sec.cabecalho
        const cNome = coluna(cab, /^conta/)
        const cDesc = coluna(cab, /descri/)
        const cValor = coluna(cab, /^valor/)
        const cFixa = coluna(cab, /fixa|recorr/)
        for (const r of sec.dados) {
          const n = texto(celula(r, cNome))
          const v = parseValor(celula(r, cValor))
          if (!n || v === null || v <= 0 || RE_TOTAL.test(normalizar(n))) continue
          contas.push({
            nome: n,
            descricao: texto(celula(r, cDesc)) || null,
            valor_centavos: v,
            fixa: cFixa === null || /^(s|sim|x|yes)$/.test(normalizar(texto(celula(r, cFixa)))),
          })
        }
      } else if (nome === abaDeve && temDesc && sec.titulo && !/minha parte|resumo|total/.test(tit)) {
        // Cada bloco "<Nome da pessoa>" + "Data | Descrição | Valor | Origem | Status" em Quem me deve.
        dividas.push(...lerDividasDaSecao(sec, 'me_deve', sec.titulo))
      }
    }
  }
  if (abaDeve && !dividas.some((d) => d.direcao === 'me_deve')) avisos.push(`Não achei blocos de pessoa na aba “${abaDeve}”.`)
  return { dividas, contas }
}

// ---------- metas ----------

const MES_CURTO = MESES.map((m) => normalizar(m).slice(0, 3))

/** Prazo da meta para 'YYYY-MM': Date, série do Excel, "10/2027", "out/2027", "outubro de 2027", "2027-10". */
export function prazoMes(v: Celula): Mes | null {
  const d = dataISO(v, null)
  if (d && (v instanceof Date || typeof v === 'number')) return d.slice(0, 7)
  const t = normalizar(texto(v))
  if (!t) return null
  let m = /^(\d{4})-(\d{1,2})/.exec(t)
  if (m && +m[2]! >= 1 && +m[2]! <= 12) return `${m[1]}-${m[2]!.padStart(2, '0')}`
  m = /^(\d{1,2})\/(\d{4})$/.exec(t)
  if (m && +m[1]! >= 1 && +m[1]! <= 12) return `${m[2]}-${m[1]!.padStart(2, '0')}`
  const comNome = mesNoTexto(t)
  if (comNome) return comNome
  m = /^([a-z]{3})[a-z]*\.?\s*(?:\/|de\s+)?\s*(\d{2}|\d{4})$/.exec(t)
  const idx = m ? MES_CURTO.indexOf(m[1]!) : -1
  if (m && idx >= 0) return `${m[2]!.length === 2 ? '20' + m[2] : m[2]}-${String(idx + 1).padStart(2, '0')}`
  return null
}

/**
 * Seção de metas, em qualquer aba: um cabeçalho com o nome da meta e pelo menos o alvo ou o guardado.
 * Ex.: Meta | Alvo | Guardado | Por mês | Prazo  (Emoji e Dia são opcionais).
 */
function lerMetas(wb: Planilha): MetaLida[] {
  const out: MetaLida[] = []
  for (const aba of wb.abas) {
    if (/lancamento|categoria|parcelas futuras|info da fatura/.test(normalizar(aba.nome))) continue
    for (const sec of secoes(aba.linhas)) {
      const cab = sec.cabecalho
      const cNome = coluna(cab, /^(meta|nome|objetivo|reserva)(\s|$)/)
      const cAlvo = coluna(cab, /alvo|juntar|valor (da |total)?meta|^objetivo \(|^total/, cNome === null ? [] : [cNome])
      const cAtual = coluna(cab, /guardado|^atual|^tenho|acumulado|^saldo|^ja tenho/)
      if (cNome === null || (cAlvo === null && cAtual === null)) continue
      const cMensal = coluna(cab, /mensal|por mes|aporte|guardar/, [cAtual ?? -1])
      const cPrazo = coluna(cab, /prazo|ate quando|^data|^quando/)
      const cEmoji = coluna(cab, /emoji|icone/) // opcional: chave de ícone (casa, viagem…)
      const cDia = coluna(cab, /^dia/)
      for (const r of sec.dados) {
        const nome = texto(celula(r, cNome))
        if (!nome || RE_TOTAL.test(normalizar(nome))) continue
        const alvo = parseValor(celula(r, cAlvo)) ?? 0
        const atual = parseValor(celula(r, cAtual)) ?? 0
        if (alvo <= 0 && atual <= 0) continue
        const dia = Number(celula(r, cDia))
        const icone = normalizar(texto(celula(r, cEmoji)))
        out.push({
          emoji: (ICONES_META as readonly string[]).includes(icone) ? iconeMeta(icone) : null,
          nome,
          alvo_centavos: Math.max(alvo, 0),
          atual_centavos: Math.max(atual, 0),
          mensal_centavos: Math.max(parseValor(celula(r, cMensal)) ?? 0, 0),
          prazo: prazoMes(celula(r, cPrazo)),
          dia: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
        })
      }
    }
  }
  return out
}

/** Lê a planilha inteira. `nomeArquivo` ajuda a achar o mês quando as abas não dizem. */
export function lerPlanilha(wb: Planilha, nomeArquivo?: string): LeituraPlanilha {
  const avisos: string[] = []
  const mes = detectarMes(wb, nomeArquivo)
  const lancamentos = lerLancamentos(wb, mes, avisos)
  const { dividas, contas } = lerDividasEContas(wb, avisos)
  const metas = lerMetas(wb)
  return { mes_detectado: mes, renda_centavos: detectarRenda(wb), lancamentos, dividas, contas, metas, avisos }
}

// ---------- pessoas ----------

/** Acha a pessoa cadastrada pelo nome ou por um dos apelidos (sem acento, sem caixa). */
export function resolverPessoa(nome: string, pessoas: readonly Pessoa[]): Pessoa | null {
  const n = normalizar(nome)
  if (!n) return null
  const nomesDe = (p: Pessoa) => [p.nome, ...(p.apelidos ?? [])].map(normalizar).filter((x) => x.length >= 2)
  const exato = pessoas.find((p) => nomesDe(p).includes(n))
  if (exato) return exato
  const palavra = (x: string) => new RegExp(`(^|[^a-z0-9])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`)
  return pessoas.find((p) => nomesDe(p).some((x) => x.length >= 3 && palavra(x).test(n))) ?? null
}

// ---------- ligar dívidas às compras ----------

export type Decisao = 'inteira' | 'dividir' | 'avulsa'

export interface Vinculo {
  /** Índice em leitura.dividas */
  divida: number
  /** Índice em leitura.lancamentos (null = não achou a compra) */
  lancamento: number | null
  /** exato: mesmo valor; diferente: achou a compra mas o valor difere; sem_compra: não achou */
  tipo: 'exato' | 'diferente' | 'sem_compra'
  sugerida: Decisao
}

const PALAVRAS_VAZIAS = new Set(['parc', 'final', 'fatura', 'compra', 'loja', 'lojas', 'para', 'com', ...MESES.map((m) => normalizar(m).slice(0, 3))])

function palavras(s: string): string[] {
  return normalizar(s)
    .split(/[^a-z0-9&]+/)
    .filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !PALAVRAS_VAZIAS.has(w))
}

/** A dívida fala da mesma loja que o lançamento? ("MERCADO LIVRE" ~ "MERCADOLIVRE", "KIKO" ~ "KIKO COSMETICS") */
function mesmoLugar(d: DividaLida, l: LancamentoLido): boolean {
  const compacto = normalizar(l.descricao).replace(/[^a-z0-9&]/g, '')
  const doLanc = palavras(l.descricao)
  const daDivida = palavras(`${d.descricao} ${d.origem ?? ''}`)
  return daDivida.some((w) => compacto.includes(w)) || doLanc.some((w) => normalizar(`${d.descricao} ${d.origem ?? ''}`).replace(/[^a-z0-9&]/g, '').includes(w))
}

function mesmaParcela(a: string | null, b: string | null): boolean {
  const pa = lerParcela(a)
  const pb = lerParcela(b)
  return !!pa && !!pb && pa[0] === pb[0] && pa[1] === pb[1]
}

function sugestao(d: DividaLida, l: LancamentoLido): Pick<Vinculo, 'tipo' | 'sugerida'> {
  if (d.valor_centavos === l.valor_centavos) return { tipo: 'exato', sugerida: 'inteira' }
  // Dívida menor que a compra: a pessoa pagou só uma parte → dividir.
  // Dívida maior: a compra inteira é dela e a diferença fica como dívida avulsa.
  return { tipo: 'diferente', sugerida: d.valor_centavos < l.valor_centavos ? 'dividir' : 'inteira' }
}

/**
 * Para cada dívida "me deve", procura a compra do cartão de onde ela veio:
 *  1. mesma parcela e mesmo valor (único);
 *  2. mesma parcela e mesma loja;
 *  3. sem parcela dos dois lados: mesmo valor e mesma loja.
 * Cada compra é usada uma vez só.
 */
export function sugerirVinculos(leitura: Pick<LeituraPlanilha, 'lancamentos' | 'dividas'>): Vinculo[] {
  const usados = new Set<number>()
  const vinculos: Vinculo[] = []
  const livres = () => leitura.lancamentos.map((l, i) => [l, i] as const).filter(([, i]) => !usados.has(i))
  leitura.dividas.forEach((d, i) => {
    if (d.direcao !== 'me_deve') return
    let achado: number | null = null
    if (d.parcela) {
      const mesmaP = livres().filter(([l]) => mesmaParcela(l.parcela, d.parcela))
      const mesmoValor = mesmaP.filter(([l]) => l.valor_centavos === d.valor_centavos)
      if (mesmoValor.length === 1) achado = mesmoValor[0]![1]
      else {
        const lugar = (mesmoValor.length > 1 ? mesmoValor : mesmaP).filter(([l]) => mesmoLugar(d, l))
        if (lugar.length) achado = lugar[0]![1]
      }
    } else {
      const c = livres().filter(([l]) => !l.parcela && l.valor_centavos === d.valor_centavos && mesmoLugar(d, l))
      if (c.length) achado = c[0]![1]
    }
    if (achado === null) {
      vinculos.push({ divida: i, lancamento: null, tipo: 'sem_compra', sugerida: 'avulsa' })
      return
    }
    usados.add(achado)
    vinculos.push({ divida: i, lancamento: achado, ...sugestao(d, leitura.lancamentos[achado]!) })
  })
  return vinculos
}

export interface Montagem {
  lancamentos: Omit<Lancamento, 'id'>[]
  dividas: Omit<Divida, 'id'>[]
  contas: Omit<ContaFixa, 'id'>[]
  /** Metas novas e metas existentes (mesmo nome) com os valores da planilha. */
  metas: { novas: Omit<Meta, 'id'>[]; atualizar: Meta[] }
}

/**
 * Monta o que vai para o banco. `pessoaId(nome)` devolve o id da pessoa daquele nome
 * (já resolvido ou criado na prévia); null = ignorar o que é dessa pessoa.
 * `decisoes[i]` troca a sugestão do vínculo da dívida i.
 */
export function montarImportacao(args: {
  leitura: LeituraPlanilha
  mes: Mes
  vinculos: readonly Vinculo[]
  decisoes?: Readonly<Record<number, Decisao>>
  pessoaId: (nome: string) => string | null
  /** Contas a criar (índices em leitura.contas). */
  contas?: readonly number[]
  /** Metas a importar (índices em leitura.metas) e as já cadastradas, para atualizar pelo nome. */
  metas?: readonly number[]
  metasExistentes?: readonly Meta[]
}): Montagem {
  const { leitura, mes } = args
  const lancs: Omit<Lancamento, 'id'>[] = leitura.lancamentos.map((l) => ({
    mes_fatura: mes,
    data_compra: l.data_compra,
    descricao: l.descricao,
    valor_centavos: l.valor_centavos,
    parcela: l.parcela,
    categoria: l.categoria,
    dono: (l.dono_nome && args.pessoaId(l.dono_nome)) || EU,
    recebido: false,
  }))
  const extras: Omit<Lancamento, 'id'>[] = []
  const dividas: Omit<Divida, 'id'>[] = []
  const porDivida = new Map(args.vinculos.map((v) => [v.divida, v]))

  const avulsa = (d: DividaLida, pessoa: string, valor = d.valor_centavos, descricao = d.descricao) =>
    dividas.push({ pessoa_id: pessoa, descricao, valor_centavos: valor, mes, recebido: d.recebido, direcao: d.direcao })

  leitura.dividas.forEach((d, i) => {
    const pessoa = args.pessoaId(d.pessoa_nome)
    if (!pessoa) return
    const v = porDivida.get(i)
    const decisao = args.decisoes?.[i] ?? v?.sugerida ?? 'avulsa'
    const alvo = v?.lancamento ?? null
    if (d.direcao !== 'me_deve' || alvo === null || decisao === 'avulsa') return void avulsa(d, pessoa)
    const l = lancs[alvo]!
    if (decisao === 'dividir' && d.valor_centavos < l.valor_centavos) {
      l.valor_centavos -= d.valor_centavos
      extras.push({ ...l, valor_centavos: d.valor_centavos, dono: pessoa, recebido: d.recebido })
      return
    }
    l.dono = pessoa
    l.recebido = d.recebido
    if (d.valor_centavos > l.valor_centavos) avulsa(d, pessoa, d.valor_centavos - l.valor_centavos, `${d.descricao} (diferença)`)
  })

  const contas = (args.contas ?? []).flatMap((i) => {
    const c = leitura.contas[i]
    return c ? [{ nome: c.nome, valor_centavos: c.valor_centavos, dia: 10, ativa: true }] : []
  })
  const metas: Montagem['metas'] = { novas: [], atualizar: [] }
  for (const i of args.metas ?? []) {
    const m = leitura.metas[i]
    if (!m) continue
    const existente = metaComMesmoNome(m.nome, args.metasExistentes ?? [])
    const base = {
      nome: m.nome,
      alvo_centavos: m.alvo_centavos,
      atual_centavos: m.atual_centavos,
      mensal_centavos: m.mensal_centavos,
      prazo: m.prazo,
    }
    if (existente)
      metas.atualizar.push({ ...existente, ...base, emoji: m.emoji ?? iconeMeta(existente.emoji), dia: m.dia ?? existente.dia, prazo: m.prazo ?? existente.prazo })
    else metas.novas.push({ ...base, emoji: m.emoji ?? ICONE_META_PADRAO, dia: m.dia ?? 10 })
  }
  return { lancamentos: [...lancs, ...extras], dividas, contas, metas }
}

/** Meta já cadastrada com o mesmo nome (sem acento/caixa). */
export function metaComMesmoNome<T extends Pick<Meta, 'nome'>>(nome: string, metas: readonly T[]): T | null {
  return metas.find((x) => normalizar(x.nome) === normalizar(nome)) ?? null
}
