import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useUsuario } from '@/auth/AuthProvider'
import { Avatar, Ponto } from '@/components/Avatar'
import { Confirmar, useDialogo } from '@/components/Dialogo'
import { Valor } from '@/components/Valor'
import { useAlternarPagamento, useReceberTudo } from '@/data/mutacoes'
import { useDadosDoMes } from '@/data/useDadosDoMes'
import { FormRenda, useAdicionar } from '@/features/formularios/formularios'
import { formatar, pct, somar } from '@/domain/dinheiro'
import { faturaAberta } from '@/domain/fatura'
import { guardarPorMes } from '@/domain/saldo'
import { mesDaData, nomeMes, nomeMesAno, nomeMesCurto } from '@/domain/meses'
import { progressoMeta, totalGuardado } from '@/domain/metas'

type Dados = ReturnType<typeof useDadosDoMes>

const dd = (n: number) => String(n).padStart(2, '0')
const anoAtual = () => new Date().getFullYear()

// ---------- Saldo previsto ----------

function CardSaldo({ d }: { d: Dados }) {
  const { abrir } = useDialogo()
  const s = d.saldo
  const segs = [
    [s.minhaFatura, 'var(--navy)'],
    [s.contasFixas, 'var(--blue)'],
    [s.guardar, 'var(--sky)'],
    [s.euDevo, 'var(--amber)'],
    [Math.max(s.sobra, 0), 'var(--green-2)'],
  ] as const
  const tot = Math.max(s.renda, s.minhaFatura + s.contasFixas + s.guardar + s.euDevo, 1)
  const editarRenda = () => abrir(<FormRenda renda={s.renda} />)
  const legenda = [
    ['Minha fatura', 'var(--navy)', s.minhaFatura],
    ['Contas fixas', 'var(--blue)', s.contasFixas],
    ['Guardar', 'var(--sky)', s.guardar],
    ...(s.euDevo > 0 ? ([['Eu devo', 'var(--amber)', s.euDevo]] as const) : []),
  ] as const
  return (
    <section className="card saldo">
      <h2>Saldo previsto</h2>
      <div className="illus" aria-hidden="true">👛</div>
      <div className="head">
        <Valor c={s.sobra} tamanho="b-xl" />
        <div className="note">
          {s.renda ? (
            <>
              <b className={s.sobra < 0 ? 'bad' : ''}>
                {s.sobra < 0 ? <ArrowDownRight strokeWidth={2.4} /> : <ArrowUpRight strokeWidth={2.4} />}
                {s.sobra < 0 ? `Faltam ${formatar(-s.sobra)}` : `${s.pctLivre}% da renda livre`}
              </b>
              <span className="lbl">estimado depois de pagar tudo de {nomeMes(d.mes)}</span>
            </>
          ) : (
            <>
              <span className="lbl">Defina sua renda para ver quanto sobra.</span>
              <br />
              <button type="button" className="btn sm" style={{ marginTop: 6 }} onClick={editarRenda}>Definir renda</button>
            </>
          )}
        </div>
      </div>
      <div className="stack">
        {segs.map(([v, cor], i) => (v > 0 ? <i key={i} style={{ flex: v / tot, background: cor }} /> : null))}
      </div>
      <div className="legend">
        <div>
          <span className="lbl">Renda</span>
          <b className="num">
            {formatar(s.renda)}{' '}
            <button type="button" className="linkbtn" aria-label="Editar renda" onClick={editarRenda}><Pencil /></button>
          </b>
        </div>
        {legenda.map(([rotulo, cor, v]) => (
          <div key={rotulo}>
            <span className="lbl"><Ponto cor={cor} />{rotulo}</span>
            <b className="num">{'−'} {formatar(v)} <small>· {pct(v, s.renda)}%</small></b>
          </div>
        ))}
        <div className="ok">
          <span className="lbl"><Ponto cor="var(--green-2)" />Sobra</span>
          <b className="num">{formatar(s.sobra)} <small>· {s.pctLivre}%</small></b>
        </div>
      </div>
    </section>
  )
}

// ---------- Contas a pagar ----------

function CardContas({ d }: { d: Dados }) {
  const [filtro, setFiltro] = useState<number | null>(null)
  const alternar = useAlternarPagamento()
  const adicionar = useAdicionar(d.mes)
  const { contasMes: itens, resumo } = d
  const dia = filtro !== null && resumo.dias.includes(filtro) ? filtro : null
  const visiveis = dia === null ? itens : itens.filter((i) => i.dia === dia)
  const hoje = new Date()
  const mHoje = mesDaData(hoje)
  return (
    <section className="card contas">
      <h2>
        Contas a pagar {resumo.proxima && <small>· próxima dia {dd(resumo.proxima.dia)}</small>}
      </h2>
      <div className="illus" aria-hidden="true">🗓️</div>
      <div style={{ marginTop: 10 }}><Valor c={resumo.emAberto} /></div>
      <div className="lbl">{resumo.pagas} de {resumo.total} pagas em {nomeMes(d.mes)}</div>
      <div className="chips">
        {resumo.dias.map((n) => {
          const doDia = itens.filter((i) => i.dia === n)
          const passou = d.mes < mHoje || (d.mes === mHoje && n < hoje.getDate())
          return (
            <button
              key={n}
              type="button"
              className={`chip num${passou ? ' past' : ''}`}
              aria-pressed={dia === n}
              aria-label={`Dia ${dd(n)}`}
              onClick={() => setFiltro(dia === n ? null : n)}
            >
              {dd(n)}
              <i>{doDia.slice(0, 5).map((i) => <span key={i.chave} className={i.pago ? 'on' : ''} />)}</i>
            </button>
          )
        })}
      </div>
      <ul className="list">
        {visiveis.map((i) => (
          <li key={i.chave} className={i.pago ? 'done' : ''}>
            <button
              type="button"
              className="check"
              role="checkbox"
              aria-checked={i.pago}
              aria-label={`Marcar ${i.nome} como paga`}
              onClick={() => alternar.mutate({ mes: d.mes, chave: i.chave })}
            >
              <Check strokeWidth={3.2} />
            </button>
            <span className="name">{i.nome}<small>dia {dd(i.dia)}</small></span>
            <span className="val num">{formatar(i.valor_centavos)}</span>
          </li>
        ))}
      </ul>
      {!d.contas.length && (
        <div className="empty" style={{ marginTop: 10 }}>
          Cadastre aluguel, internet, luz… e acompanhe o que já foi pago.
          <br />
          <button type="button" className="btn sm" onClick={() => adicionar('conta')}>Adicionar conta fixa</button>
        </div>
      )}
    </section>
  )
}

// ---------- Quem me deve ----------

function CardDeve({ d }: { d: Dados }) {
  const { abrir } = useDialogo()
  const receber = useReceberTudo()
  const adicionar = useAdicionar(d.mes)
  const eu = useUsuario()
  const { search } = useLocation()
  const total = somar(d.pendentes, (p) => p.valor_centavos)
  const [primeiro, segundo] = d.devedores
  const lista = [...d.pendentes].sort((a, b) => b.valor_centavos - a.valor_centavos)
  const corDe = (id: string) => d.pessoas.find((p) => p.id === id)?.cor ?? '#8A93A3'
  const nomeDe = (id: string) => d.pessoas.find((p) => p.id === id)?.nome ?? 'Sem pessoa'
  return (
    <section className="card deve">
      <h2>Quem me deve</h2>
      <div className="illus" aria-hidden="true">⚖️</div>
      <div className="lbl" style={{ marginTop: 14 }}>Total a receber</div>
      <Valor c={total} />
      {primeiro ? (
        <>
          <div className="who">
            {[primeiro, segundo].filter(Boolean).map((g) => (
              <div key={g!.pessoa.id}>
                <span className="lbl"><Ponto cor={g!.pessoa.cor} />{g!.pessoa.nome} deve</span>
                <b className="num">{formatar(g!.total)}</b>
              </div>
            ))}
          </div>
          <div className="split">
            {d.devedores.map((g) => (
              <i key={g.pessoa.id} style={{ flex: g.total, background: g.pessoa.cor }}>{pct(g.total, total)}%</i>
            ))}
          </div>
          <div className="sub">O que falta receber</div>
          <ul className="list">
            {lista.slice(0, 7).map((p) => (
              <li key={p.origem + p.id}>
                <Ponto cor={corDe(p.pessoa_id)} />
                <span className="name">
                  {p.descricao}
                  <small>{nomeDe(p.pessoa_id)} · {nomeMesCurto(p.mes, anoAtual())}{p.parcela ? ` · ${p.parcela}` : ''}</small>
                </span>
                <span className="val num">{formatar(p.valor_centavos)}</span>
              </li>
            ))}
          </ul>
          {lista.length > 7 && (
            <Link className="lbl" to={{ pathname: '/quem-me-deve', search }} style={{ display: 'block', marginTop: 6 }}>
              Ver todos ({lista.length})
            </Link>
          )}
          <div className="foot">
            <Avatar pessoa={primeiro.pessoa} pequeno />
            <span className="pix"><ArrowRight strokeWidth={2.4} /></span>
            <span className="avatar av-sm" style={{ background: 'var(--blue)' }}>{eu.nome[0]?.toUpperCase()}</span>
            <span className="grow">
              {primeiro.pessoa.nome} te devolve <b className="num">{formatar(primeiro.total)}</b> no Pix
            </span>
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                abrir(
                  <Confirmar
                    titulo="Marcar como recebido"
                    texto={`${primeiro.pessoa.nome} te pagou ${formatar(primeiro.total)}? Os ${primeiro.itens.length} itens pendentes vão para recebidos.`}
                    rotulo="Marcar recebido"
                    aoConfirmar={() => receber.mutateAsync(primeiro.pessoa.id)}
                  />,
                )
              }
            >
              Marcar recebido
            </button>
          </div>
        </>
      ) : (
        <div className="empty" style={{ marginTop: 14 }}>
          Ninguém te deve nada agora. Marque compras do cartão como de outra pessoa em Lançamentos, ou adicione uma dívida.
          <br />
          <button type="button" className="btn sm" onClick={() => adicionar('me_deve')}>Adicionar dívida</button>
        </div>
      )}
    </section>
  )
}

// ---------- Cartão ----------

function ChipCartao() {
  return (
    <svg className="chip-svg" viewBox="0 0 34 26" aria-hidden="true">
      <rect x=".5" y=".5" width="33" height="25" rx="5" fill="#F5D58A" stroke="#C9A24E" />
      <path d="M0 9h11M0 17h11M23 9h11M23 17h11M11 0v26M23 0v26" stroke="#C9A24E" />
    </svg>
  )
}

function CardCartao({ d }: { d: Dados }) {
  const adicionar = useAdicionar(d.mes)
  const { search } = useLocation()
  const aberta = faturaAberta(d.mes, d.config.dia_fechamento, new Date())
  const mm = d.mes.slice(5, 7)
  const tier = d.config.cartao_nome.split(' ').slice(1).join(' ') || 'PLATINUM'
  const max = Math.max(...d.proximas.map((c) => c.total), 1)
  const pts = d.proximas.map((c, i) => [((i + 0.5) / 3) * 100, 66 - (c.total / max) * 30] as const)
  const projetada = d.projetada && d.total > 0
  return (
    <section className="card cartao">
      <h2>Cartão</h2>
      <div className="illus" aria-hidden="true">💳</div>
      <div className="lbl" style={{ marginTop: 14 }}>Fatura de {nomeMes(d.mes)}{projetada ? ' · prevista' : ''}</div>
      <Valor c={d.total} />
      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
        <Link className="btn sm" to={{ pathname: '/lancamentos', search }}>Ver lançamentos</Link>
        <button type="button" className="btn sm" onClick={() => adicionar('import')}>Importar planilha</button>
      </div>
      <div className="cc">
        <div className="between">
          <span className="logo">itaú</span>
          <span className="pill">{aberta ? 'Aberta' : 'Fechada'}</span>
        </div>
        <div className="tier">{tier.toUpperCase()}</div>
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div><ChipCartao /></div>
          <div style={{ textAlign: 'right' }}>
            <small>Fecha · Vence</small>
            <b className="num">{dd(d.config.dia_fechamento)}/{mm} · {dd(d.config.dia_vencimento)}/{mm}</b>
          </div>
        </div>
      </div>
      <div className="sec">Próximas faturas</div>
      <div className="nexts">
        {d.proximas.map((c, i) => (
          <div key={c.mes} className={`col${i === 0 ? ' cur' : ''}`}>
            <div>
              <b>{nomeMesCurto(c.mes, anoAtual())}</b>
              {i === 0 && (<><br /><span className="tag">{aberta ? 'Aberta' : 'Fechada'}</span></>)}
            </div>
            <span className="v num">{formatar(c.total)}</span>
          </div>
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={pts.map((p) => p.join(',')).join(' ')}
            fill="none" stroke="var(--faint)" strokeWidth=".6" strokeDasharray="1.6 1.6" vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <ellipse
              key={i} cx={p[0]} cy={p[1]} rx="1.6" ry="2.2" fill="var(--surface)"
              stroke={i === 0 ? 'var(--blue)' : 'var(--faint)'} strokeWidth="1.5" vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="lbl" style={{ marginTop: 8, fontSize: 11.5 }}>Meses futuros mostram só as parcelas já assumidas.</div>
    </section>
  )
}

// ---------- Metas e reserva ----------

function CardMetas({ d }: { d: Dados }) {
  const adicionar = useAdicionar(d.mes)
  const mensal = guardarPorMes(d.metas)
  const mesAtual = mesDaData(new Date())
  return (
    <section className="card metas">
      <h2>Metas e reserva</h2>
      <div className="illus" aria-hidden="true">🐷</div>
      <div className="lbl" style={{ marginTop: 14 }}>Total guardado</div>
      <Valor c={totalGuardado(d.metas)} />
      {d.metas.length ? (
        <>
          <div className="okline">
            <Check strokeWidth={3.2} />
            <span>
              Guardando <b className="num">{formatar(mensal)}</b> por mês
              {d.config.renda_centavos ? ` · ${pct(mensal, d.config.renda_centavos)}% da renda` : ''}
            </span>
          </div>
          {d.metas.map((m) => {
            const p = progressoMeta(m, mesAtual)
            return (
              <div key={m.id} className="meta">
                <div className="top2">
                  <span className="ico">{m.emoji || '🎯'}</span>
                  <span className="name">
                    {m.nome}
                    <small className="num">{formatar(m.atual_centavos)} de {formatar(m.alvo_centavos)}</small>
                  </span>
                  <b className="num">{p.pct}%</b>
                </div>
                <div className="bar"><i style={{ width: `${p.pct}%` }} /></div>
                <div className="hint">
                  <span>{m.prazo ? `até ${nomeMesCurto(m.prazo, 0).split(' ')[0]} ${m.prazo.slice(0, 4)}` : 'sem prazo'}</span>
                  <span>
                    {p.batida ? 'Meta batida 🎉' : p.precisaPorMes ? `precisa ${formatar(p.precisaPorMes)}/mês` : `faltam ${formatar(p.falta)}`}
                  </span>
                </div>
              </div>
            )
          })}
        </>
      ) : (
        <div className="empty" style={{ marginTop: 14 }}>
          Crie sua reserva de emergência, a entrada do apê ou uma viagem.
          <br />
          <button type="button" className="btn sm" onClick={() => adicionar('meta')}>Criar meta</button>
        </div>
      )}
    </section>
  )
}

// ---------- Para onde foi a fatura ----------

function CardCategorias({ d }: { d: Dados }) {
  const adicionar = useAdicionar(d.mes)
  const max = d.categorias[0]?.total ?? 1
  return (
    <section className="card cat">
      <div className="between">
        <h2>Para onde foi a fatura</h2>
        {d.projetada && d.total > 0 && <span className="pill2">prevista</span>}
      </div>
      <div className="row" style={{ gap: 28, marginTop: 10, flexWrap: 'wrap' }}>
        <div><div className="lbl">Minha parte</div><Valor c={d.minha} tamanho="b-m" /></div>
        <div><div className="lbl">Compras dos outros</div><Valor c={d.outros} tamanho="b-m" /></div>
      </div>
      {d.categorias.length ? (
        <div className="cats">
          {d.categorias.map((c) => (
            <div key={c.nome} className="catrow">
              <span className="n">{c.nome}</span>
              <span className="v num">
                {formatar(c.total)} <span className="muted" style={{ fontWeight: 500 }}>· {pct(c.total, d.total)}%</span>
              </span>
              <div className="bar"><i style={{ width: `${Math.max(0, (c.total / max) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 14 }}>
          Sem lançamentos em {nomeMesAno(d.mes)}. Importe a planilha do mês ou adicione os gastos.
          <br />
          <button type="button" className="btn sm" onClick={() => adicionar('import')}>Importar planilha</button>{' '}
          <button type="button" className="btn sm" onClick={() => adicionar('lanc')}>Adicionar lançamento</button>
        </div>
      )}
    </section>
  )
}

// ---------- tela ----------

export function VisaoGeral() {
  const d = useDadosDoMes()
  const adicionar = useAdicionar(d.mes)
  if (d.carregando) return <div className="card lbl" role="status">Carregando…</div>
  return (
    <div className="grid">
      {d.vazio && (
        <div className="banner" style={{ gridColumn: '1/-1', background: 'var(--blue-soft)', margin: 0 }}>
          <span>👋</span>
          <div className="grow">Comece importando a planilha da fatura do Itaú, ou vá adicionando à mão: lançamentos, contas, pessoas e metas.</div>
          <button type="button" className="btn sm primary" onClick={() => adicionar('import')}>Importar planilha</button>
          <button type="button" className="btn sm" onClick={() => adicionar('lanc')}>Adicionar à mão</button>
        </div>
      )}
      <div className="colL">
        <CardSaldo d={d} />
        <div className="pair">
          <CardDeve d={d} />
          <CardCartao d={d} />
        </div>
        <CardCategorias d={d} />
      </div>
      <div className="colR">
        <CardContas d={d} />
        <CardMetas d={d} />
      </div>
    </div>
  )
}
