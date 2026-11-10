// Categorias da planilha (aba Categorias) e categoria automática por palavra-chave.
// As palavras-chave vêm da função `categoria` do protótipo, adaptadas às categorias da planilha.

export interface CategoriaInfo {
  nome: string
}

export const CATEGORIAS: readonly CategoriaInfo[] = [
  { nome: 'Restaurante' },
  { nome: 'Alimentação' },
  { nome: 'Supermercado' },
  { nome: 'Transporte' },
  { nome: 'Saúde' },
  { nome: 'Educação' },
  { nome: 'Assinaturas' },
  { nome: 'Compras' },
  { nome: 'Vestuário' },
  { nome: 'Serviços' },
  { nome: 'Lazer' },
  { nome: 'Outros' },
]

export const OUTROS = 'Outros'

/** Minúsculas, sem acento e sem espaços nas pontas. */
export function normalizar(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// A ordem importa: "mercado livre" tem que cair em Compras antes de "mercado" cair em Supermercado.
const REGRAS: readonly [RegExp, string][] = [
  [/\buber\b|\b99\b|99app|99pop|cabify|\bposto\b|combust|\bshell\b|ipiranga|estacion/, 'Transporte'],
  [/ifood|rappi|delivery/, 'Alimentação'],
  [/mercado ?livre|amazon|shopee|aliexpress|magalu|shein|temu/, 'Compras'],
  [/supermerc|mercado|atacad|assai|carrefour|gbarbosa|hiper/, 'Supermercado'],
  [/farmac|drog|pague menos|raia|clinic|hospital|laborat|odonto/, 'Saúde'],
  [
    /netflix|spotify|apple|google|youtube|prime|disney|hbo|\bmax\b|deezer|icloud|chatgpt|openai|claude|anthropic|wellhub|gympass/,
    'Assinaturas',
  ],
  [/restaur|lanch|\bbar\b|burger|pizza|\bcafe|padaria|acai|sorvet|outback|sushi/, 'Alimentação'],
  [/academ|smart ?fit|esport|centauro|decathlon|hyrox|corrida|cinema|ingresso/, 'Lazer'],
  [/renner|riachuelo|c&a|\bcea\b|zara|youcom|hering|nike|adidas/, 'Vestuário'],
  [/cosmet|boticario|natura|kiko|sephora/, 'Compras'],
  [/refrigera|conserto|manuten|oficina|lavanderia|chaveiro/, 'Serviços'],
  [/curso|escola|faculdade|udemy|alura|livraria/, 'Educação'],
]

/** Categoria automática a partir da descrição. */
export function categoria(descricao: string): string {
  const d = normalizar(descricao)
  for (const [re, c] of REGRAS) if (re.test(d)) return c
  return OUTROS
}

