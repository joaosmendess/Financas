// Gravação dos dados. Cada mutação invalida as consultas que muda.
// Marcar/desmarcar (pago, recebido, dono) é otimista: a tela muda na hora e volta se der erro.
import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { metaDaChave } from '@/domain/contasAPagar'
import type { Config, ContaFixa, Divida, Lancamento, Mes, Meta, Pessoa } from '@/domain/tipos'
import type { Json } from '@/lib/database.types'
import { ok, supabase } from '@/lib/supabase'
import { chaves } from './consultas'

type SemId<T> = Omit<T, 'id'>
/** Para formulários: sem id = criar; com id = editar. */
export type Salvar<T extends { id: string }> = SemId<T> & { id?: string }

function invalidar(qc: QueryClient, ...keys: QueryKey[]) {
  return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })))
}

/** Aplica uma mudança no cache de uma lista e devolve como desfazer. */
async function otimista<T>(qc: QueryClient, key: QueryKey, mudar: (lista: T[]) => T[]) {
  await qc.cancelQueries({ queryKey: key })
  const antes = qc.getQueryData<T[]>(key)
  if (antes) qc.setQueryData<T[]>(key, mudar(antes))
  return () => qc.setQueryData(key, antes)
}

// ---------- config ----------

export function useSalvarConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Config>) =>
      ok(await supabase.from('config').upsert(patch, { onConflict: 'user_id' }).select().single()),
    onSuccess: (dados) => qc.setQueryData(chaves.config, dados),
  })
}

// ---------- pessoas ----------

export function useSalvarPessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...v }: Salvar<Pessoa>): Promise<Pessoa> =>
      id
        ? ok(await supabase.from('pessoas').update(v).eq('id', id).select('id, nome, cor, apelidos').single())
        : ok(await supabase.from('pessoas').insert(v).select('id, nome, cor, apelidos').single()),
    onSuccess: () => invalidar(qc, chaves.pessoas),
  })
}

export function useExcluirPessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('pessoas').delete().eq('id', id)),
    // O banco devolve os lançamentos para 'eu' e apaga as dívidas da pessoa.
    onSuccess: () => invalidar(qc, chaves.pessoas, chaves.lancamentos, chaves.dividas),
  })
}

// ---------- lançamentos ----------

export function useSalvarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...v }: Salvar<Lancamento>) =>
      id
        ? ok(await supabase.from('lancamentos').update(v).eq('id', id))
        : ok(await supabase.from('lancamentos').insert(v)),
    onSuccess: () => invalidar(qc, chaves.lancamentos),
  })
}

/** Vários de uma vez ("Começar o mês com essas parcelas"). */
export function useInserirLancamentos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lista: SemId<Lancamento>[]) => ok(await supabase.from('lancamentos').insert(lista)),
    onSuccess: () => invalidar(qc, chaves.lancamentos),
  })
}

/** Mudanças rápidas na lista: dono, recebido. */
export function useAtualizarLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SemId<Lancamento>> }) =>
      ok(await supabase.from('lancamentos').update(patch).eq('id', id)),
    onMutate: ({ id, patch }) =>
      otimista<Lancamento>(qc, chaves.lancamentos, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    onError: (_e, _v, desfazer) => desfazer?.(),
    onSettled: () => invalidar(qc, chaves.lancamentos),
  })
}

/**
 * Divide uma compra entre mim e outra pessoa: a original fica com (valor − parte)
 * e uma cópia com a parte vai para `dono`. Ex.: TV R$ 233,90, metade do Painho.
 */
export function useDividirLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lancamento, parte, dono }: { lancamento: Lancamento; parte: number; dono: string }) => {
      if (parte <= 0 || parte >= lancamento.valor_centavos) throw new Error('A parte tem que ser menor que o valor da compra.')
      const { id, ...resto } = lancamento
      ok(await supabase.from('lancamentos').insert({ ...resto, valor_centavos: parte, dono, recebido: false }))
      ok(await supabase.from('lancamentos').update({ valor_centavos: lancamento.valor_centavos - parte }).eq('id', id))
    },
    onSuccess: () => invalidar(qc, chaves.lancamentos),
  })
}

export function useExcluirLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('lancamentos').delete().eq('id', id)),
    onSuccess: () => invalidar(qc, chaves.lancamentos),
  })
}

// ---------- contas fixas ----------

export function useSalvarConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...v }: Salvar<ContaFixa>) =>
      id
        ? ok(await supabase.from('contas_fixas').update(v).eq('id', id))
        : ok(await supabase.from('contas_fixas').insert(v)),
    onSuccess: () => invalidar(qc, chaves.contas),
  })
}

export function useExcluirConta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('contas_fixas').delete().eq('id', id)),
    onSuccess: () => invalidar(qc, chaves.contas),
  })
}

// ---------- dívidas (quem me deve / quem eu devo) ----------

export function useSalvarDivida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...v }: Salvar<Divida>) =>
      id
        ? ok(await supabase.from('dividas').update(v).eq('id', id))
        : ok(await supabase.from('dividas').insert(v)),
    onSuccess: () => invalidar(qc, chaves.dividas),
  })
}

export function useAtualizarDivida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SemId<Divida>> }) =>
      ok(await supabase.from('dividas').update(patch).eq('id', id)),
    onMutate: ({ id, patch }) =>
      otimista<Divida>(qc, chaves.dividas, (l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    onError: (_e, _v, desfazer) => desfazer?.(),
    onSettled: () => invalidar(qc, chaves.dividas),
  })
}

export function useExcluirDivida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('dividas').delete().eq('id', id)),
    onSuccess: () => invalidar(qc, chaves.dividas),
  })
}

/** "Recebi tudo" de uma pessoa (lançamentos e dívidas me_deve). */
export function useReceberTudo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pessoaId: string) => ok(await supabase.rpc('receber_tudo', { p_pessoa: pessoaId })),
    onSuccess: () => invalidar(qc, chaves.lancamentos, chaves.dividas),
  })
}

// ---------- metas ----------

export function useSalvarMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...v }: Salvar<Meta>) =>
      id ? ok(await supabase.from('metas').update(v).eq('id', id)) : ok(await supabase.from('metas').insert(v)),
    onSuccess: () => invalidar(qc, chaves.metas),
  })
}

/** "Guardar valor" / "Retirar": grava o novo valor guardado. */
export function useAtualizarGuardado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, atual_centavos }: { id: string; atual_centavos: number }) =>
      ok(await supabase.from('metas').update({ atual_centavos }).eq('id', id)),
    onMutate: ({ id, atual_centavos }) =>
      otimista<Meta>(qc, chaves.metas, (l) => l.map((m) => (m.id === id ? { ...m, atual_centavos } : m))),
    onError: (_e, _v, desfazer) => desfazer?.(),
    onSettled: () => invalidar(qc, chaves.metas),
  })
}

export function useExcluirMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => ok(await supabase.from('metas').delete().eq('id', id)),
    onSuccess: () => invalidar(qc, chaves.metas),
  })
}

// ---------- contas a pagar ----------

/** Marca/desmarca um item de Contas a pagar. Para metas, o banco ajusta o valor guardado. */
export function useAlternarPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ mes, chave }: { mes: Mes; chave: string }) =>
      ok(await supabase.rpc('alternar_pagamento', { p_mes: mes, p_chave: chave })),
    onMutate: async ({ mes, chave }) => {
      const key = chaves.pagamentos(mes)
      await qc.cancelQueries({ queryKey: key })
      const antes = qc.getQueryData<Set<string>>(key)
      if (antes) {
        const novo = new Set(antes)
        if (novo.has(chave)) novo.delete(chave)
        else novo.add(chave)
        qc.setQueryData(key, novo)
      }
      return () => qc.setQueryData(key, antes)
    },
    onError: (_e, _v, desfazer) => desfazer?.(),
    onSettled: (_d, _e, { mes, chave }) =>
      invalidar(qc, chaves.pagamentos(mes), ...(metaDaChave(chave) ? [chaves.metas] : [])),
  })
}

// ---------- importação e dados ----------

export interface Importacao {
  mes: Mes
  lancamentos: SemId<Lancamento>[]
  dividas: SemId<Divida>[]
  renda_centavos: number | null
}

export function useImportarFatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (imp: Importacao) =>
      ok(
        await supabase.rpc('importar_fatura', {
          p_mes: imp.mes,
          p_lancamentos: imp.lancamentos as unknown as Json,
          p_dividas: imp.dividas as unknown as Json,
          ...(imp.renda_centavos ? { p_renda_centavos: imp.renda_centavos } : {}),
        }),
      ) as { lancamentos: number; dividas: number },
    onSuccess: () => invalidar(qc, chaves.lancamentos, chaves.dividas, chaves.config),
  })
}

export function useApagarTudo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => ok(await supabase.rpc('apagar_tudo')),
    onSuccess: () => qc.invalidateQueries(),
  })
}
