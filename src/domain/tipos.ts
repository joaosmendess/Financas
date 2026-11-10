// Tipos do domínio. Os nomes dos campos seguem as colunas do banco (snake_case),
// assim as linhas que vêm do Supabase entram aqui sem mapeamento.

/** Valor em centavos (inteiro). R$ 12,34 = 1234. */
export type Centavos = number

/** Mês no formato 'YYYY-MM'. */
export type Mes = string

/** Dono de um lançamento: 'eu' ou o id de uma pessoa. */
export const EU = 'eu'
export type Dono = string

export interface Config {
  renda_centavos: Centavos
  cartao_nome: string
  dia_fechamento: number
  dia_vencimento: number
}

export const CONFIG_PADRAO: Config = {
  renda_centavos: 0,
  cartao_nome: 'Itaú Platinum',
  dia_fechamento: 2,
  dia_vencimento: 9,
}

export interface Pessoa {
  id: string
  nome: string
  cor: string
  /** Outros nomes (ex.: "José Valter"), usados na importação. */
  apelidos?: string[]
}

export interface Lancamento {
  id: string
  mes_fatura: Mes
  /** 'YYYY-MM-DD' */
  data_compra: string | null
  descricao: string
  valor_centavos: Centavos
  /** 'NN/NN', ex.: '02/10' */
  parcela: string | null
  categoria: string | null
  dono: Dono
  recebido: boolean
}

/** Lançamento como aparece numa fatura: real ou projetado a partir das parcelas. */
export interface LancamentoFatura extends Lancamento {
  projetado: boolean
}

export interface ContaFixa {
  id: string
  nome: string
  valor_centavos: Centavos
  dia: number
  ativa: boolean
}

/** 'me_deve': a pessoa me deve. 'eu_devo': eu devo à pessoa. */
export type DirecaoDivida = 'me_deve' | 'eu_devo'

export interface Divida {
  id: string
  pessoa_id: string
  descricao: string
  valor_centavos: Centavos
  mes: Mes
  /** Para 'me_deve': já recebi. Para 'eu_devo': já paguei. */
  recebido: boolean
  direcao: DirecaoDivida
}

export interface Meta {
  id: string
  /** Chave do ícone (ver domain/icones.ts). A coluna se chama emoji por histórico. */
  emoji: string
  nome: string
  alvo_centavos: Centavos
  atual_centavos: Centavos
  mensal_centavos: Centavos
  /** 'YYYY-MM' */
  prazo: Mes | null
  dia: number
}
