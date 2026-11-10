import { Pencil, Plus, Trash2 } from 'lucide-react'
import { BotaoIcone } from '@/components/BotaoIcone'
import { Confirmar, useDialogo } from '@/components/Dialogo'
import { Valor } from '@/components/Valor'
import { useExcluirMeta } from '@/data/mutacoes'
import { useMetas } from '@/data/consultas'
import { FormMeta, FormMovimentoMeta } from '@/features/formularios/formularios'
import { Importar } from '@/features/importar/Importar'
import { useMes } from '@/state/mes'
import { formatar } from '@/domain/dinheiro'
import { MESES_CURTOS, mesDaData } from '@/domain/meses'
import { progressoMeta } from '@/domain/metas'

const prazoTexto = (prazo: string) => `até ${MESES_CURTOS[Number(prazo.slice(5, 7)) - 1]} ${prazo.slice(0, 4)}`

export function Metas() {
  const { data: metas = [], isPending } = useMetas()
  const { abrir } = useDialogo()
  const excluir = useExcluirMeta()
  const mesAtual = mesDaData(new Date())
  const { mes } = useMes()
  const importar = () => abrir(<Importar mes={mes} foco="metas" />)

  return (
    <>
      <div className="vhead">
        <h1>Metas e reserva</h1>
        <button type="button" className="btn" onClick={importar}>Importar planilha</button>
        <button type="button" className="btn primary" onClick={() => abrir(<FormMeta />)}><Plus strokeWidth={2.4} />Meta</button>
      </div>
      {isPending ? (
        <div className="card lbl" role="status">Carregando…</div>
      ) : metas.length ? (
        <div className="cols">
          {metas.map((m) => {
            const p = progressoMeta(m, mesAtual)
            return (
              <div key={m.id} className="card">
                <div className="between">
                  <h2 className="row"><span className="meta"><span className="ico">{m.emoji || '🎯'}</span></span>{m.nome}</h2>
                  <div className="acts">
                    <BotaoIcone rotulo="Editar" onClick={() => abrir(<FormMeta meta={m} />)}><Pencil /></BotaoIcone>
                    <BotaoIcone rotulo="Excluir" onClick={() =>
                        abrir(
                          <Confirmar
                            titulo="Excluir meta"
                            texto="A meta e o valor guardado nela saem do sistema."
                            rotulo="Excluir"
                            aoConfirmar={() => excluir.mutateAsync(m.id)}
                          />,
                        )
                      }><Trash2 /></BotaoIcone>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Valor c={m.atual_centavos} tamanho="b-m" /> <span className="muted num">de {formatar(m.alvo_centavos)}</span>
                </div>
                <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
                <div className="between lbl" style={{ marginTop: 8 }}>
                  <span>{p.pct}% · guardando {formatar(m.mensal_centavos)}/mês</span>
                  <span>{m.prazo ? prazoTexto(m.prazo) : ''}</span>
                </div>
                {!p.batida && p.precisaPorMes && (
                  <div className="lbl" style={{ marginTop: 4 }}>precisa {formatar(p.precisaPorMes)}/mês para chegar no prazo</div>
                )}
                <div className="row" style={{ marginTop: 14 }}>
                  <button type="button" className="btn sm" onClick={() => abrir(<FormMovimentoMeta meta={m} tipo="guardar" />)}>Guardar valor</button>
                  <button type="button" className="btn sm" onClick={() => abrir(<FormMovimentoMeta meta={m} tipo="retirar" />)}>Retirar</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty">
          Nenhuma meta ainda. Crie sua reserva de emergência, a entrada do apê ou uma viagem.
          <br />
          <button type="button" className="btn sm" onClick={() => abrir(<FormMeta />)}>Criar meta</button>{' '}
          <button type="button" className="btn sm" onClick={importar}>Importar planilha</button>
        </div>
      )}
    </>
  )
}
