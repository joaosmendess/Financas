import { Pencil, Pin, Plus, Split, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { BotaoIcone } from '@/components/BotaoIcone'
import { Confirmar, useDialogo } from '@/components/Dialogo'
import { useToast } from '@/components/Toast'
import { useAtualizarLancamento, useExcluirLancamento, useInserirLancamentos } from '@/data/mutacoes'
import { useDadosDoMes } from '@/data/useDadosDoMes'
import { FormDividir, FormLancamento, useAdicionar } from '@/features/formularios/formularios'
import { categoria, normalizar } from '@/domain/categoria'
import { formatar, somar } from '@/domain/dinheiro'
import { ddmm, nomeMesAno } from '@/domain/meses'
import { EU, type LancamentoFatura } from '@/domain/tipos'

export function Lancamentos() {
  const d = useDadosDoMes()
  const adicionar = useAdicionar(d.mes)
  const { abrir } = useDialogo()
  const toast = useToast()
  const atualizar = useAtualizarLancamento()
  const excluir = useExcluirLancamento()
  const inserir = useInserirLancamentos()
  const [busca, setBusca] = useState('')

  const projetados = d.reais.length ? [] : d.itens
  const termo = normalizar(busca)
  const itens = [...d.itens]
    .filter((l) => !termo || normalizar(`${l.descricao} ${l.categoria ?? ''}`).includes(termo))
    .sort((a, b) => (b.data_compra ?? '').localeCompare(a.data_compra ?? ''))

  const opcoes = [{ id: EU, nome: 'Eu' }, ...d.pessoas]
  const nomeDono = (id: string) => opcoes.find((o) => o.id === id)?.nome ?? 'Eu'
  const stats = [
    ['Total da fatura', d.total],
    ['Minha parte', d.minha],
    ...d.pessoas.map((p) => [p.nome, somar(d.itens.filter((l) => l.dono === p.id), (l) => l.valor_centavos)] as const),
  ] as const

  function comecarMes() {
    inserir.mutate(
      projetados.map(({ id: _id, projetado: _p, ...l }) => l),
      { onSuccess: () => toast('Parcelas adicionadas') },
    )
  }

  function excluirLanc(l: LancamentoFatura) {
    abrir(
      <Confirmar
        titulo="Excluir lançamento"
        texto="Esse lançamento será removido da fatura."
        rotulo="Excluir"
        aoConfirmar={() => excluir.mutateAsync(l.id)}
      />,
    )
  }

  return (
    <>
      <div className="vhead">
        <h1>Lançamentos de {nomeMesAno(d.mes)}</h1>
        <input
          className="search"
          type="search"
          placeholder="Buscar"
          aria-label="Buscar lançamentos"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button type="button" className="btn" onClick={() => adicionar('import')}>Importar planilha</button>
        <button type="button" className="btn primary" onClick={() => adicionar('lanc')}><Plus strokeWidth={2.4} />Lançamento</button>
      </div>

      <div className="stats">
        {stats.map(([n, v]) => (
          <div key={n} className="stat"><span className="lbl">{n}</span><b className="num">{formatar(v)}</b></div>
        ))}
      </div>

      {projetados.length > 0 && (
        <div className="banner">
          <Pin className="banner-ico" aria-hidden="true" />
          <div className="grow">
            Ainda não tem lançamentos em {nomeMesAno(d.mes)}. Abaixo estão as {projetados.length} parcelas que já caem nesta fatura.
          </div>
          <button type="button" className="btn sm primary" disabled={inserir.isPending} onClick={comecarMes}>
            Começar o mês com essas parcelas
          </button>
        </div>
      )}

      <div className="card tablewrap">
        {d.carregando ? (
          <div className="esqueleto-linhas" role="status" aria-label="Carregando">{Array.from({ length: 6 }).map((_, i) => <i key={i} />)}</div>
        ) : itens.length ? (
          <table className="tabela-lanc">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Parcela</th>
                <th>De quem</th>
                <th className="r">Valor</th>
                <th><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((l) => (
                <tr key={l.id}>
                  <td className="num col-data">{ddmm(l.data_compra)}</td>
                  <td className="col-desc">
                    <span className="d">{l.descricao}</span>
                    <span className="c">
                      <span className="show-sm num">{ddmm(l.data_compra)} · </span>
                      {l.categoria || categoria(l.descricao)}
                      <span className="show-sm num">{l.parcela ? ` · ${l.parcela}` : ''}</span>
                    </span>
                  </td>
                  <td className="num col-parc">{l.parcela ?? '—'}</td>
                  <td className="col-dono">
                    {l.projetado ? (
                      nomeDono(l.dono)
                    ) : (
                      <select
                        className="dono"
                        aria-label="De quem é"
                        value={l.dono}
                        onChange={(e) => atualizar.mutate({ id: l.id, patch: { dono: e.target.value, recebido: false } })}
                      >
                        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="r num col-valor"><b>{formatar(l.valor_centavos)}</b></td>
                  <td className="col-acts">
                    {!l.projetado && (
                      <div className="acts">
                        <BotaoIcone rotulo="Editar" onClick={() => abrir(<FormLancamento mes={d.mes} lancamento={l} />)}><Pencil /></BotaoIcone>
                        <BotaoIcone rotulo="Dividir com alguém" onClick={() => abrir(<FormDividir lancamento={l} />)}><Split /></BotaoIcone>
                        <BotaoIcone rotulo="Excluir" onClick={() => excluirLanc(l)}><Trash2 /></BotaoIcone>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">{busca ? 'Nada encontrado para essa busca.' : 'Nenhum lançamento neste mês.'}</div>
        )}
      </div>
    </>
  )
}
