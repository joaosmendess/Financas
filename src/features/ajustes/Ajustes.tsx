import { LogOut, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { Avatar } from '@/components/Avatar'
import { BotaoIcone } from '@/components/BotaoIcone'
import { Confirmar, useDialogo } from '@/components/Dialogo'
import { useToast } from '@/components/Toast'
import {
  useConfig, useContasFixas, useDividas, useLancamentos, useMetas, usePessoas,
} from '@/data/consultas'
import { useApagarTudo, useExcluirConta, useExcluirPessoa, useSalvarConfig, useSalvarConta } from '@/data/mutacoes'
import { FormConta, FormPessoa, useAdicionar } from '@/features/formularios/formularios'
import { formatar, paraCampo, parseValor } from '@/domain/dinheiro'
import { CONFIG_PADRAO } from '@/domain/tipos'
import { SeletorTema } from '@/layout/Shell'
import { useMes } from '@/state/mes'

const dd = (n: number) => String(n).padStart(2, '0')
const limitarDia = (v: string, padrao: number) => Math.min(31, Math.max(1, Number(v) || padrao))

function CardRendaCartao() {
  const { data: config } = useConfig()
  const salvar = useSalvarConfig()
  const toast = useToast()
  const [renda, setRenda] = useState('')
  const [nome, setNome] = useState('')
  const [fecha, setFecha] = useState('')
  const [vence, setVence] = useState('')

  useEffect(() => {
    if (!config) return
    setRenda(config.renda_centavos ? paraCampo(config.renda_centavos) : '')
    setNome(config.cartao_nome)
    setFecha(String(config.dia_fechamento))
    setVence(String(config.dia_vencimento))
  }, [config])

  function enviar(e: FormEvent) {
    e.preventDefault()
    const r = renda.trim() ? parseValor(renda) : 0
    if (r === null || r < 0) return toast('Renda inválida')
    salvar.mutate(
      {
        renda_centavos: r,
        cartao_nome: nome.trim() || CONFIG_PADRAO.cartao_nome,
        dia_fechamento: limitarDia(fecha, CONFIG_PADRAO.dia_fechamento),
        dia_vencimento: limitarDia(vence, CONFIG_PADRAO.dia_vencimento),
      },
      { onSuccess: () => toast('Ajustes salvos') },
    )
  }

  return (
    <form className="card" onSubmit={enviar}>
      <h2>Renda e cartão</h2>
      <p className="lbl">A renda é usada para calcular quanto sobra no mês.</p>
      <div className="field">
        <label htmlFor="aj-renda">Renda mensal (R$)</label>
        <input id="aj-renda" inputMode="decimal" placeholder="0,00" value={renda} onChange={(e) => setRenda(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="aj-cn">Nome do cartão</label>
        <input id="aj-cn" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="fields2">
        <div className="field">
          <label htmlFor="aj-fe">Dia do fechamento</label>
          <input id="aj-fe" type="number" min={1} max={31} value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="aj-ve">Dia do vencimento</label>
          <input id="aj-ve" type="number" min={1} max={31} value={vence} onChange={(e) => setVence(e.target.value)} />
        </div>
      </div>
      <button className="btn primary" disabled={salvar.isPending}>Salvar</button>
    </form>
  )
}

function CardContas() {
  const { data: contas = [] } = useContasFixas()
  const { abrir } = useDialogo()
  const excluir = useExcluirConta()
  const salvar = useSalvarConta()
  return (
    <div className="card">
      <div className="between">
        <h2>Contas fixas</h2>
        <button type="button" className="btn sm" onClick={() => abrir(<FormConta />)}><Plus strokeWidth={2.4} />Conta</button>
      </div>
      <ul className="list" style={{ marginTop: 8 }}>
        {contas.length ? (
          contas.map((c) => (
            <li key={c.id} className={c.ativa ? '' : 'done'}>
              <input
                type="checkbox"
                checked={c.ativa}
                aria-label={`${c.nome} ativa`}
                title="Ativa"
                onChange={(e) => salvar.mutate({ ...c, ativa: e.target.checked })}
              />
              <span className="name">{c.nome}<small>todo dia {dd(c.dia)}{c.ativa ? '' : ' · pausada'}</small></span>
              <span className="val num">{formatar(c.valor_centavos)}</span>
              <div className="acts">
                <BotaoIcone rotulo="Editar" onClick={() => abrir(<FormConta conta={c} />)}><Pencil /></BotaoIcone>
                <BotaoIcone rotulo="Excluir" onClick={() =>
                    abrir(
                      <Confirmar
                        titulo="Excluir conta fixa"
                        texto="A conta deixa de aparecer em Contas a pagar."
                        rotulo="Excluir"
                        aoConfirmar={() => excluir.mutateAsync(c.id)}
                      />,
                    )
                  }><Trash2 /></BotaoIcone>
              </div>
            </li>
          ))
        ) : (
          <li className="muted">Nenhuma conta fixa.</li>
        )}
      </ul>
    </div>
  )
}

function CardPessoas() {
  const { data: pessoas = [] } = usePessoas()
  const { abrir } = useDialogo()
  const excluir = useExcluirPessoa()
  return (
    <div className="card">
      <div className="between">
        <h2>Pessoas</h2>
        <button type="button" className="btn sm" onClick={() => abrir(<FormPessoa />)}><Plus strokeWidth={2.4} />Pessoa</button>
      </div>
      <p className="lbl">Quem usa seu cartão, te deve ou a quem você deve.</p>
      <ul className="list">
        {pessoas.length ? (
          pessoas.map((p) => (
            <li key={p.id}>
              <Avatar pessoa={p} />
              <span className="name">
                {p.nome}
                {p.apelidos?.length ? <small>também: {p.apelidos.join(', ')}</small> : null}
              </span>
              <div className="acts">
                <BotaoIcone rotulo="Editar" onClick={() => abrir(<FormPessoa pessoa={p} />)}><Pencil /></BotaoIcone>
                <BotaoIcone rotulo="Excluir" onClick={() =>
                    abrir(
                      <Confirmar
                        titulo="Excluir pessoa"
                        texto="Os lançamentos dessa pessoa voltam a ser seus, e as dívidas dela são apagadas."
                        rotulo="Excluir"
                        aoConfirmar={() => excluir.mutateAsync(p.id)}
                      />,
                    )
                  }><Trash2 /></BotaoIcone>
              </div>
            </li>
          ))
        ) : (
          <li className="muted">Nenhuma pessoa ainda.</li>
        )}
      </ul>
    </div>
  )
}

function CardDados() {
  const { mes } = useMes()
  const adicionar = useAdicionar(mes)
  const { abrir } = useDialogo()
  const { sair } = useAuth()
  const apagar = useApagarTudo()
  const toast = useToast()
  const dados = {
    config: useConfig().data,
    pessoas: usePessoas().data,
    lancamentos: useLancamentos().data,
    contas_fixas: useContasFixas().data,
    dividas: useDividas().data,
    metas: useMetas().data,
  }

  function baixar() {
    const blob = new Blob([JSON.stringify({ versao: 1, exportado_em: new Date().toISOString(), ...dados }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financas-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card">
      <h2>Dados</h2>
      <p className="lbl">Seus dados ficam salvos na sua conta e só você vê.</p>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={() => adicionar('import')}>Importar planilha</button>
        <button type="button" className="btn" onClick={baixar}>Baixar backup</button>
        <button
          type="button"
          className="btn danger"
          onClick={() =>
            abrir(
              <Confirmar
                titulo="Apagar tudo"
                texto="Todos os lançamentos, contas, pessoas, dívidas e metas serão apagados. Baixe um backup antes, se quiser guardar."
                rotulo="Apagar tudo"
                aoConfirmar={() => apagar.mutateAsync().then(() => toast('Tudo apagado'))}
              />,
            )
          }
        >
          Apagar tudo
        </button>
        <button type="button" className="btn" onClick={sair}><LogOut />Sair</button>
      </div>
    </div>
  )
}

export function Ajustes() {
  return (
    <>
      <div className="vhead"><h1>Ajustes</h1></div>
      <div className="cols">
        <CardRendaCartao />
        <CardContas />
        <CardPessoas />
        <div className="card">
          <div className="between">
            <div>
              <h2>Aparência</h2>
              <p className="lbl" style={{ margin: '4px 0 0' }}>Tema claro ou escuro neste aparelho.</p>
            </div>
            <SeletorTema comRotulo={false} />
          </div>
        </div>
        <CardDados />
      </div>
    </>
  )
}
