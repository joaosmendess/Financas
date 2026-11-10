// Importar planilha: escolher arquivo → prévia (mês, pessoas, vínculos, contas) → gravar.
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDialogo } from '@/components/Dialogo'
import { useToast } from '@/components/Toast'
import { useConfig, useContasFixas, useLancamentos, useMetas, usePessoas } from '@/data/consultas'
import { useImportarPlanilha } from '@/data/mutacoes'
import { normalizar } from '@/domain/categoria'
import { formatar, somar } from '@/domain/dinheiro'
import {
  lerPlanilha, metaComMesmoNome, montarImportacao, resolverPessoa, sugerirVinculos, type Decisao,
  type LeituraPlanilha,
} from '@/domain/importador'
import { ehMes, nomeMesAno } from '@/domain/meses'
import { EU, type Mes, type Pessoa } from '@/domain/tipos'

const CORES = ['#2563EB', '#E5466F', '#0EA5A4', '#B45309', '#7C3AED', '#15803D']
const NOVA = '__nova__'
const IGNORAR = '__ignorar__'

async function lerArquivo(file: File): Promise<LeituraPlanilha> {
  const { lerXlsx } = await import('@/domain/planilhaXlsx') // SheetJS só carrega aqui
  return lerPlanilha(lerXlsx(await file.arrayBuffer()), file.name)
}

async function baixarModeloMetas() {
  const { modeloMetas } = await import('@/domain/planilhaXlsx')
  const url = URL.createObjectURL(
    new Blob([modeloMetas()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-metas.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

export function Importar({ mes, foco }: { mes: Mes; foco?: 'metas' }) {
  const { fechar } = useDialogo()
  const toast = useToast()
  const [leitura, setLeitura] = useState<{ dados: LeituraPlanilha; arquivo: string } | null>(null)
  const [lendo, setLendo] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function escolher(file: File | undefined) {
    if (!file) return
    setLendo(true)
    try {
      setLeitura({ dados: await lerArquivo(file), arquivo: file.name })
    } catch {
      toast('Não consegui ler esse arquivo. Confira se é .xlsx.')
    } finally {
      setLendo(false)
    }
  }

  if (leitura) return <Previa leitura={leitura.dados} arquivo={leitura.arquivo} mesPadrao={mes} />

  return (
    <>
      <h3>Importar planilha</h3>
      <p>
        {foco === 'metas'
          ? 'Envie uma planilha (.xlsx) com uma tabela de metas: Meta, Alvo, Guardado, Por mês e Prazo. Mostro tudo antes de gravar.'
          : 'Envie a planilha da fatura (.xlsx). Eu leio as abas Lançamentos, Quem me deve, Minhas despesas e Metas e mostro tudo antes de gravar.'}
      </p>
      <div
        className={`drop${arrastando ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastando(true)
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastando(false)
          void escolher(e.dataTransfer.files[0])
        }}
      >
        <div style={{ fontSize: 30 }}>📄</div>
        <div style={{ margin: '6px 0 10px' }}>{lendo ? 'Lendo a planilha…' : 'Arraste o arquivo aqui'}</div>
        <button type="button" className="btn primary" disabled={lendo} onClick={() => input.current?.click()}>
          Escolher arquivo
        </button>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          hidden
          onChange={(e) => {
            void escolher(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      <div className="mfoot" style={{ marginTop: 14 }}>
        {foco === 'metas' && (
          <button type="button" className="btn" style={{ marginRight: 'auto' }} onClick={() => void baixarModeloMetas()}>
            Baixar modelo
          </button>
        )}
        <button type="button" className="btn" onClick={fechar}>Cancelar</button>
      </div>
    </>
  )
}

const TEXTO_DECISAO: Record<Decisao, string> = {
  inteira: 'A compra inteira é dela',
  dividir: 'Dividir a compra',
  avulsa: 'Manter como dívida avulsa',
}

function Previa({ leitura, arquivo, mesPadrao }: { leitura: LeituraPlanilha; arquivo: string; mesPadrao: Mes }) {
  const { fechar } = useDialogo()
  const toast = useToast()
  const navegar = useNavigate()
  const { data: pessoas = [] } = usePessoas()
  const { data: config } = useConfig()
  const { data: lancamentos = [] } = useLancamentos()
  const { data: contasExistentes = [] } = useContasFixas()
  const { data: metasExistentes = [] } = useMetas()
  const importar = useImportarPlanilha()

  const [mes, setMes] = useState<Mes>(leitura.mes_detectado ?? mesPadrao)
  const vinculos = useMemo(() => sugerirVinculos(leitura), [leitura])
  const [decisoes, setDecisoes] = useState<Record<number, Decisao>>({})

  // Nomes que aparecem na planilha → pessoa cadastrada, nova ou ignorar.
  const nomes = useMemo(
    () => [...new Set([...leitura.dividas.map((d) => d.pessoa_nome), ...leitura.lancamentos.flatMap((l) => (l.dono_nome ? [l.dono_nome] : []))])],
    [leitura],
  )
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const escolhaDe = (nome: string) => escolhas[nome] ?? resolverPessoa(nome, pessoas)?.id ?? NOVA

  // Contas fixas da planilha que ainda não existem (pelo nome).
  const jaExiste = (n: string) => contasExistentes.some((c) => normalizar(c.nome) === normalizar(n))
  const [contasSel, setContasSel] = useState<Set<number>>(
    () => new Set(leitura.contas.flatMap((c, i) => (c.fixa ? [i] : []))),
  )

  const [metasSel, setMetasSel] = useState<Set<number>>(() => new Set(leitura.metas.map((_, i) => i)))
  const metasEscolhidas = [...metasSel]

  // Prévia do resultado com ids provisórios para quem ainda vai ser criado.
  const idPrevia = (nome: string) => {
    const e = escolhaDe(nome)
    return e === IGNORAR ? null : e === NOVA ? `novo:${nome}` : e
  }
  const contasEscolhidas = [...contasSel].filter((i) => !jaExiste(leitura.contas[i]!.nome))
  const previa = montarImportacao({
    leitura, mes, vinculos, decisoes, pessoaId: idPrevia, contas: contasEscolhidas, metas: metasEscolhidas, metasExistentes,
  })
  const nomeDoId = (id: string) =>
    id === EU ? 'Eu' : id.startsWith('novo:') ? id.slice(5) : (pessoas.find((p) => p.id === id)?.nome ?? id)
  const porDono = new Map<string, number>()
  for (const l of previa.lancamentos) porDono.set(l.dono, (porDono.get(l.dono) ?? 0) + l.valor_centavos)
  const avulsasMeDeve = previa.dividas.filter((d) => d.direcao === 'me_deve')
  const euDevo = previa.dividas.filter((d) => d.direcao === 'eu_devo')
  const existentes = lancamentos.filter((l) => l.mes_fatura === mes).length
  const usarRenda = !!leitura.renda_centavos && !config?.renda_centavos
  // Só lançamentos e dívidas dependem do mês da fatura.
  const temFatura = leitura.lancamentos.length > 0 || leitura.dividas.length > 0

  if (!leitura.lancamentos.length && !leitura.dividas.length && !leitura.metas.length && !leitura.contas.length) {
    return (
      <>
        <h3>Nada para importar</h3>
        <p>Não encontrei lançamentos, dívidas, contas nem metas em “{arquivo}”.</p>
        {leitura.avisos.map((a) => <p key={a}>{a}</p>)}
        <div className="mfoot"><button type="button" className="btn primary" onClick={fechar}>Entendi</button></div>
      </>
    )
  }

  function gravar() {
    const novas = nomes.filter((n) => escolhaDe(n) === NOVA)
    const apelidos = new Map<string, Pessoa>()
    for (const n of nomes) {
      const id = escolhaDe(n)
      const p = pessoas.find((x) => x.id === id)
      if (!p) continue
      const conhecidos = [p.nome, ...(p.apelidos ?? [])].map(normalizar)
      if (conhecidos.includes(normalizar(n))) continue
      const atual = apelidos.get(p.id) ?? p
      apelidos.set(p.id, { ...atual, apelidos: [...(atual.apelidos ?? []), n] })
    }
    importar.mutate(
      {
        mes,
        renda_centavos: usarRenda ? leitura.renda_centavos : null,
        pessoasNovas: novas.map((nome, i) => ({ nome, cor: CORES[(pessoas.length + i) % CORES.length]! })),
        apelidosNovos: [...apelidos.values()].map((p) => ({ id: p.id, apelidos: p.apelidos ?? [] })),
        montar: (idDoNovo) =>
          montarImportacao({
            leitura, mes, vinculos, decisoes, contas: contasEscolhidas, metas: metasEscolhidas, metasExistentes,
            pessoaId: (nome) => {
              const e = escolhaDe(nome)
              return e === IGNORAR ? null : e === NOVA ? idDoNovo(nome) : e
            },
          }),
      },
      {
        onSuccess: (r) => {
          fechar()
          const partes = [
            r.lancamentos && `${r.lancamentos} lançamentos`,
            r.dividas && `${r.dividas} dívidas`,
            r.contas && `${r.contas} contas`,
            r.metas && `${r.metas} metas`,
          ].filter(Boolean)
          toast(partes.length ? `Importado: ${partes.join(' · ')}` : 'Nada novo para importar')
          if (r.lancamentos) navegar({ pathname: '/lancamentos', search: `?mes=${mes}` })
          else if (r.metas) navegar({ pathname: '/metas', search: `?mes=${mes}` })
        },
      },
    )
  }

  const comCompra = vinculos.filter((v) => v.lancamento !== null)

  return (
    <>
      <h3>Conferir importação</h3>
      {temFatura ? (
      <p>
        “{arquivo}” vai para a fatura de{' '}
        <input
          type="month"
          aria-label="Mês da fatura"
          value={mes}
          onChange={(e) => ehMes(e.target.value) && setMes(e.target.value)}
          className="rounded-[9px] border border-line bg-surface-2 px-2 py-0.5 font-bold text-ink"
        />
        {leitura.mes_detectado && leitura.mes_detectado === mes ? ' (achei na planilha)' : ''}
      </p>
      ) : (
        <p>Conferindo “{arquivo}”.</p>
      )}

      <ul className="summary-list">
        {leitura.lancamentos.length > 0 && (
        <li>
          <span>Lançamentos</span>
          <b className="num">{previa.lancamentos.length} · {formatar(somar(previa.lancamentos, (l) => l.valor_centavos))}</b>
        </li>
        )}
        {[...porDono].sort(([a], [b]) => (a === EU ? -1 : b === EU ? 1 : 0)).map(([dono, v]) => (
          <li key={dono}>
            <span className="muted">{dono === EU ? 'Minha parte' : `De ${nomeDoId(dono)}`}</span>
            <span className="num">{formatar(v)}</span>
          </li>
        ))}
        {avulsasMeDeve.length > 0 && (
          <li>
            <span>Dívidas avulsas a receber</span>
            <b className="num">{avulsasMeDeve.length} · {formatar(somar(avulsasMeDeve, (d) => d.valor_centavos))}</b>
          </li>
        )}
        {euDevo.length > 0 && (
          <li><span>Eu devo</span><b className="num">{euDevo.length} · {formatar(somar(euDevo, (d) => d.valor_centavos))}</b></li>
        )}
        {leitura.renda_centavos !== null && (
        <li>
          <span>Renda</span>
          <b className="num">
            {formatar(leitura.renda_centavos)}{usarRenda ? '' : ' (mantida a atual)'}
          </b>
        </li>
        )}
      </ul>

      {existentes > 0 && leitura.lancamentos.length > 0 && <p><b>Já existem {existentes} lançamentos em {nomeMesAno(mes)}.</b> Eles serão substituídos.</p>}

      {nomes.length > 0 && (
        <>
          <div className="sub">Quem é quem</div>
          {nomes.map((n) => (
            <div key={n} className="field">
              <label htmlFor={`pessoa-${n}`}>“{n}” na planilha é</label>
              <select id={`pessoa-${n}`} value={escolhaDe(n)} onChange={(e) => setEscolhas((s) => ({ ...s, [n]: e.target.value }))}>
                {pessoas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                <option value={NOVA}>Criar pessoa “{n}”</option>
                <option value={IGNORAR}>Ignorar</option>
              </select>
            </div>
          ))}
        </>
      )}

      {comCompra.length > 0 && (
        <>
          <div className="sub">Compras do cartão que são de outra pessoa</div>
          <p style={{ marginBottom: 6 }}>
            Cada dívida da aba Quem me deve foi ligada à compra de origem, para não contar duas vezes. Confira as marcadas.
          </p>
          <ul className="list" style={{ marginBottom: 12 }}>
            {comCompra.map((v) => {
              const d = leitura.dividas[v.divida]!
              const l = leitura.lancamentos[v.lancamento!]!
              const decisao = decisoes[v.divida] ?? v.sugerida
              return (
                <li key={v.divida} style={{ flexWrap: 'wrap' }}>
                  <span className="name" style={{ whiteSpace: 'normal' }}>
                    {v.tipo === 'diferente' ? '⚠️ ' : '✓ '}
                    {d.descricao}
                    <small>
                      {d.pessoa_nome} · {formatar(d.valor_centavos)} → {l.descricao} {l.parcela ?? ''} · {formatar(l.valor_centavos)}
                    </small>
                  </span>
                  {v.tipo === 'diferente' && (
                    <select
                      className="dono"
                      aria-label={`O que fazer com ${d.descricao}`}
                      value={decisao}
                      onChange={(e) => setDecisoes((s) => ({ ...s, [v.divida]: e.target.value as Decisao }))}
                    >
                      {(d.valor_centavos < l.valor_centavos ? (['dividir', 'inteira', 'avulsa'] as const) : (['inteira', 'avulsa'] as const)).map((x) => (
                        <option key={x} value={x}>
                          {x === 'inteira' && d.valor_centavos > l.valor_centavos
                            ? `Compra inteira + ${formatar(d.valor_centavos - l.valor_centavos)} avulso`
                            : x === 'dividir'
                              ? `Dividir: ${formatar(d.valor_centavos)} dela`
                              : TEXTO_DECISAO[x]}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {leitura.contas.length > 0 && (
        <>
          <div className="sub">Contas fora do cartão</div>
          <p style={{ marginBottom: 6 }}>As marcadas viram contas fixas (dia 10; ajuste depois em Ajustes).</p>
          {leitura.contas.map((c, i) => {
            const existe = jaExiste(c.nome)
            return (
              <label key={i} className="switch" style={{ marginBottom: 6, fontWeight: 500 }}>
                <input
                  type="checkbox"
                  disabled={existe}
                  checked={!existe && contasSel.has(i)}
                  onChange={(e) =>
                    setContasSel((s) => {
                      const n = new Set(s)
                      if (e.target.checked) n.add(i)
                      else n.delete(i)
                      return n
                    })
                  }
                />
                <span className="grow">{c.nome}{existe ? ' (já cadastrada)' : c.fixa ? '' : ' (não é fixa)'}</span>
                <span className="num">{formatar(c.valor_centavos)}</span>
              </label>
            )
          })}
        </>
      )}

      {leitura.metas.length > 0 && (
        <>
          <div className="sub">Metas</div>
          <p style={{ marginBottom: 6 }}>Metas com o mesmo nome de uma já cadastrada são atualizadas com os valores da planilha.</p>
          {leitura.metas.map((m, i) => {
            const existe = !!metaComMesmoNome(m.nome, metasExistentes)
            return (
              <label key={i} className="switch" style={{ marginBottom: 6, fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={metasSel.has(i)}
                  onChange={(e) =>
                    setMetasSel((s) => {
                      const n = new Set(s)
                      if (e.target.checked) n.add(i)
                      else n.delete(i)
                      return n
                    })
                  }
                />
                <span className="grow">
                  {m.emoji ?? '🎯'} {m.nome}
                  {existe ? ' (atualiza a existente)' : ''}
                  <span className="lbl" style={{ display: 'block' }}>
                    {formatar(m.atual_centavos)} de {formatar(m.alvo_centavos)}
                    {m.mensal_centavos ? ` · ${formatar(m.mensal_centavos)}/mês` : ''}
                    {m.prazo ? ` · até ${m.prazo.slice(5, 7)}/${m.prazo.slice(0, 4)}` : ''}
                  </span>
                </span>
              </label>
            )
          })}
        </>
      )}

      {leitura.avisos.map((a) => <p key={a}>{a}</p>)}

      <div className="mfoot">
        <button type="button" className="btn" onClick={fechar}>Cancelar</button>
        <button type="button" className="btn primary" disabled={importar.isPending} onClick={gravar}>
          {importar.isPending ? 'Importando…' : 'Importar'}
        </button>
      </div>
    </>
  )
}
