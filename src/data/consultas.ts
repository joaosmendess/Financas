// Leitura dos dados (TanStack Query). Cada tabela tem uma chave de cache;
// as mutações em mutacoes.ts invalidam as chaves que afetam.
import { useQuery } from '@tanstack/react-query'
import { ok, supabase } from '@/lib/supabase'
import {
  CONFIG_PADRAO, type Config, type ContaFixa, type DirecaoDivida, type Divida, type Lancamento, type Mes, type Meta,
  type Pessoa,
} from '@/domain/tipos'

export const chaves = {
  config: ['config'] as const,
  pessoas: ['pessoas'] as const,
  lancamentos: ['lancamentos'] as const,
  contas: ['contas_fixas'] as const,
  dividas: ['dividas'] as const,
  metas: ['metas'] as const,
  pagamentosTodos: ['pagamentos'] as const,
  pagamentos: (mes: Mes) => ['pagamentos', mes] as const,
}

/** Configuração do usuário. Na primeira vez cria a linha com os padrões do protótipo. */
export function useConfig() {
  return useQuery({
    queryKey: chaves.config,
    queryFn: async (): Promise<Config> => {
      const atual = ok(await supabase.from('config').select('*').maybeSingle())
      if (atual) return atual
      ok(await supabase.from('config').upsert({ ...CONFIG_PADRAO }, { onConflict: 'user_id', ignoreDuplicates: true }))
      return ok(await supabase.from('config').select('*').single())
    },
  })
}

export function usePessoas() {
  return useQuery({
    queryKey: chaves.pessoas,
    queryFn: async (): Promise<Pessoa[]> =>
      ok(await supabase.from('pessoas').select('id, nome, cor, apelidos').order('created_at')),
  })
}

/**
 * Todos os lançamentos. A projeção de meses vazios e "Quem me deve" precisam do histórico,
 * e o volume de um app pessoal (algumas dezenas por mês) cabe tranquilo em memória.
 */
export function useLancamentos() {
  return useQuery({
    queryKey: chaves.lancamentos,
    queryFn: async (): Promise<Lancamento[]> =>
      ok(
        await supabase
          .from('lancamentos')
          .select('id, mes_fatura, data_compra, descricao, valor_centavos, parcela, categoria, dono, recebido')
          .order('data_compra', { ascending: false, nullsFirst: false })
          .order('created_at'),
      ),
  })
}

export function useContasFixas() {
  return useQuery({
    queryKey: chaves.contas,
    queryFn: async (): Promise<ContaFixa[]> =>
      ok(await supabase.from('contas_fixas').select('id, nome, valor_centavos, dia, ativa').order('dia').order('nome')),
  })
}

export function useDividas() {
  return useQuery({
    queryKey: chaves.dividas,
    queryFn: async (): Promise<Divida[]> => {
      const linhas = ok(
        await supabase
          .from('dividas')
          .select('id, pessoa_id, descricao, valor_centavos, mes, recebido, direcao')
          .order('created_at'),
      )
      return linhas.map((d) => ({ ...d, direcao: d.direcao as DirecaoDivida }))
    },
  })
}

export function useMetas() {
  return useQuery({
    queryKey: chaves.metas,
    queryFn: async (): Promise<Meta[]> =>
      ok(
        await supabase
          .from('metas')
          .select('id, emoji, nome, alvo_centavos, atual_centavos, mensal_centavos, prazo, dia')
          .order('created_at'),
      ),
  })
}

/** Chaves dos itens de "Contas a pagar" já pagos no mês. */
export function usePagamentos(mes: Mes) {
  return useQuery({
    queryKey: chaves.pagamentos(mes),
    queryFn: async (): Promise<Set<string>> => {
      const linhas = ok(await supabase.from('pagamentos_mes').select('item_chave').eq('mes', mes).eq('pago', true))
      return new Set(linhas.map((l) => l.item_chave))
    },
  })
}
