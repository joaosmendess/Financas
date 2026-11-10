import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Confirmar, useDialogo } from '@/components/Dialogo'
import { Valor } from '@/components/Valor'
import { useAtualizarDivida, useAtualizarLancamento, useExcluirDivida, useReceberTudo } from '@/data/mutacoes'
import { useDadosDoMes } from '@/data/useDadosDoMes'
import { FormDivida, useAdicionar } from '@/features/formularios/formularios'
import { formatar, somar } from '@/domain/dinheiro'
import { nomeMesCurto } from '@/domain/meses'
import { itensDaPessoa, tudoQueEuDevo, tudoQueMeDevem, type Pendencia } from '@/domain/quemMeDeve'
import type { DirecaoDivida } from '@/domain/tipos'

const anoAtual = () => new Date().getFullYear()

export function QuemMeDeve() {
  const d = useDadosDoMes()
  const adicionar = useAdicionar(d.mes)
  const { abrir } = useDialogo()
  const atualizarLanc = useAtualizarLancamento()
  const atualizarDiv = useAtualizarDivida()
  const excluirDiv = useExcluirDivida()
  const receberTudo = useReceberTudo()
  const [aba, setAba] = useState<DirecaoDivida>('me_deve')
  const meDeve = aba === 'me_deve'

  const todos = meDeve ? tudoQueMeDevem(d.lancamentos, d.dividas) : tudoQueEuDevo(d.dividas)

  function alternar(p: Pendencia) {
    if (p.origem === 'lancamento') atualizarLanc.mutate({ id: p.id, patch: { recebido: !p.recebido } })
    else atualizarDiv.mutate({ id: p.id, patch: { recebido: !p.recebido } })
  }

  // Função de render (não componente) para não remontar a linha a cada clique.
  function linha(p: Pendencia) {
    const divida = d.dividas.find((x) => x.id === p.id)
    return (
      <li key={p.origem + p.id} className={p.recebido ? 'done' : ''}>
        <button
          type="button"
          className="check"
          role="checkbox"
          aria-checked={p.recebido}
          aria-label={meDeve ? 'Marcar como recebido' : 'Marcar como pago'}
          onClick={() => alternar(p)}
        >
          <Check strokeWidth={3.2} />
        </button>
        <span className="name">
          {p.descricao}
          <small>
            {p.origem === 'lancamento' ? 'Cartão' : 'Avulso'} · {nomeMesCurto(p.mes, anoAtual())}
            {p.parcela ? ` · ${p.parcela}` : ''}
          </small>
        </span>
        <span className="val num">{formatar(p.valor_centavos)}</span>
        {p.origem === 'divida' && divida && (
          <div className="acts">
            <button type="button" className="iconbtn" aria-label="Editar" onClick={() => abrir(<FormDivida mes={d.mes} direcao={aba} divida={divida} />)}><Pencil /></button>
            <button
              type="button"
              className="iconbtn"
              aria-label="Excluir"
              onClick={() =>
                abrir(<Confirmar titulo="Excluir dívida" texto="Essa dívida será removida." rotulo="Excluir" aoConfirmar={() => excluirDiv.mutateAsync(p.id)} />)
              }
            >
              <Trash2 />
            </button>
          </div>
        )}
      </li>
    )
  }

  return (
    <>
      <div className="vhead">
        <h1>{meDeve ? 'Quem me deve' : 'Quem eu devo'}</h1>
        <button type="button" className="btn primary" onClick={() => adicionar(aba)}>
          <Plus strokeWidth={2.4} />{meDeve ? 'Dívida' : 'Eu devo'}
        </button>
      </div>

      <div className="tabs" role="tablist" aria-label="Direção">
        <button type="button" role="tab" aria-selected={meDeve} onClick={() => setAba('me_deve')}>Me devem</button>
        <button type="button" role="tab" aria-selected={!meDeve} onClick={() => setAba('eu_devo')}>Eu devo</button>
      </div>

      {!d.pessoas.length ? (
        <div className="empty">
          Cadastre as pessoas que usam seu cartão, te devem ou a quem você deve.
          <br />
          <button type="button" className="btn sm" onClick={() => adicionar('pessoa')}>Adicionar pessoa</button>
        </div>
      ) : (
        <div className="cols">
          {d.pessoas.map((pessoa) => {
            const { pendentes, resolvidos } = itensDaPessoa(todos, pessoa.id)
            const falta = somar(pendentes, (x) => x.valor_centavos)
            return (
              <div key={pessoa.id} className="card">
                <div className="between">
                  <h2 className="row"><Avatar pessoa={pessoa} />{pessoa.nome}</h2>
                  {meDeve && pendentes.length > 0 && (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() =>
                        abrir(
                          <Confirmar
                            titulo="Marcar como recebido"
                            texto={`${pessoa.nome} te pagou ${formatar(falta)}? Os ${pendentes.length} itens pendentes vão para recebidos.`}
                            rotulo="Marcar recebido"
                            aoConfirmar={() => receberTudo.mutateAsync(pessoa.id)}
                          />,
                        )
                      }
                    >
                      Recebi tudo
                    </button>
                  )}
                </div>
                <div className="lbl" style={{ marginTop: 12 }}>{meDeve ? 'Falta receber' : 'Falta pagar'}</div>
                <Valor c={falta} tamanho="b-m" />
                <ul className="list" style={{ marginTop: 8 }}>
                  {pendentes.length ? pendentes.map(linha) : <li className="muted">Nada pendente.</li>}
                </ul>
                {resolvidos.length > 0 && (
                  <details>
                    <summary>
                      {meDeve ? 'Recebidos' : 'Pagos'} ({resolvidos.length}) · {formatar(somar(resolvidos, (x) => x.valor_centavos))}
                    </summary>
                    <ul className="list">{resolvidos.map(linha)}</ul>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
