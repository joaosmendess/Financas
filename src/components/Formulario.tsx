// Formulário genérico dos modais, no estilo do `form()` do protótipo.
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { parseValor } from '@/domain/dinheiro'
import { ICONE_META } from './icones'
import { useDialogo } from './Dialogo'
import { ModalTitulo } from './ui/dialog'
import { useToast } from './Toast'

export type Campo =
  | { nome: string; rotulo: string; tipo?: 'text' | 'date' | 'month' | 'color'; obrigatorio?: boolean; ajuda?: string; placeholder?: string }
  | { nome: string; rotulo: string; tipo: 'dinheiro'; obrigatorio?: boolean; ajuda?: string; positivo?: boolean }
  | { nome: string; rotulo: string; tipo: 'number'; min?: number; max?: number; obrigatorio?: boolean; ajuda?: string }
  | { nome: string; rotulo: string; tipo: 'select'; opcoes: readonly (readonly [string, string])[]; ajuda?: string }
  | { nome: string; rotulo: string; tipo: 'check' }
  | { nome: string; rotulo: string; tipo: 'icone' }

/** Valores lidos do formulário. Dinheiro vem em centavos; números como number; check como boolean. */
export type Valores = Record<string, string | number | boolean | null>

export function Formulario(props: {
  titulo: string
  descricao?: ReactNode
  campos: readonly Campo[]
  inicial: Record<string, string | boolean>
  rotuloSalvar?: string
  aoSalvar: (v: Valores) => Promise<unknown> | void
  /** Conteúdo extra antes dos botões. */
  extra?: ReactNode
}) {
  const { fechar } = useDialogo()
  const toast = useToast()
  const prefixo = useId()
  const [valores, setValores] = useState<Record<string, string | boolean>>(() => {
    const v: Record<string, string | boolean> = {}
    for (const c of props.campos) v[c.nome] = props.inicial[c.nome] ?? (c.tipo === 'check' ? false : '')
    return v
  })
  const [salvando, setSalvando] = useState(false)

  const mudar = (nome: string, v: string | boolean) => setValores((s) => ({ ...s, [nome]: v }))

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const out: Valores = {}
    for (const c of props.campos) {
      const bruto = valores[c.nome]
      if (c.tipo === 'check') {
        out[c.nome] = !!bruto
        continue
      }
      const s = String(bruto ?? '').trim()
      if ('obrigatorio' in c && c.obrigatorio && !s) {
        toast(`Preencha: ${c.rotulo}`)
        document.getElementById(`${prefixo}-${c.nome}`)?.focus()
        return
      }
      if (c.tipo === 'dinheiro') {
        const v = s ? parseValor(s) : 0
        if (v === null || (c.positivo && v < 0)) {
          toast('Informe um valor válido')
          document.getElementById(`${prefixo}-${c.nome}`)?.focus()
          return
        }
        out[c.nome] = v
      } else if (c.tipo === 'number') {
        const n = s ? Number(s) : null
        if (n !== null && (!Number.isFinite(n) || (c.min !== undefined && n < c.min) || (c.max !== undefined && n > c.max))) {
          toast(`${c.rotulo}: valor fora do intervalo`)
          return
        }
        out[c.nome] = n
      } else {
        out[c.nome] = s || null
      }
    }
    setSalvando(true)
    try {
      await props.aoSalvar(out)
      fechar()
    } catch (err) {
      // Erros do Supabase já viram toast pelo MutationCache; erros de validação chegam aqui.
      if (err instanceof Error && err.name === 'Validacao') toast(err.message)
      setSalvando(false)
    }
  }

  return (
    <>
      <ModalTitulo>{props.titulo}</ModalTitulo>
      {props.descricao && <p>{props.descricao}</p>}
      <form onSubmit={enviar} noValidate>
        {props.campos.map((c) => {
          const id = `${prefixo}-${c.nome}`
          const v = valores[c.nome]
          if (c.tipo === 'icone')
            return (
              <fieldset key={c.nome} className="field icones">
                <legend>{c.rotulo}</legend>
                <div role="radiogroup" aria-label={c.rotulo}>
                  {Object.entries(ICONE_META).map(([chave, { rotulo, Icone }]) => (
                    <button
                      key={chave}
                      type="button"
                      role="radio"
                      aria-checked={v === chave}
                      aria-label={rotulo}
                      title={rotulo}
                      onClick={() => mudar(c.nome, chave)}
                    >
                      <Icone />
                    </button>
                  ))}
                </div>
              </fieldset>
            )
          if (c.tipo === 'check')
            return (
              <label key={c.nome} className="switch">
                <input type="checkbox" checked={!!v} onChange={(e) => mudar(c.nome, e.target.checked)} />
                {c.rotulo}
              </label>
            )
          return (
            <div key={c.nome} className="field">
              <label htmlFor={id}>{c.rotulo}</label>
              {c.tipo === 'select' ? (
                <select id={id} value={String(v)} onChange={(e) => mudar(c.nome, e.target.value)}>
                  {c.opcoes.map(([valor, texto]) => (
                    <option key={valor} value={valor}>{texto}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={c.tipo === 'dinheiro' || !c.tipo ? 'text' : c.tipo}
                  inputMode={c.tipo === 'dinheiro' ? 'decimal' : c.tipo === 'number' ? 'numeric' : undefined}
                  placeholder={c.tipo === 'dinheiro' ? '0,00' : 'placeholder' in c ? c.placeholder : undefined}
                  min={c.tipo === 'number' ? c.min : undefined}
                  max={c.tipo === 'number' ? c.max : undefined}
                  value={String(v)}
                  onChange={(e) => mudar(c.nome, e.target.value)}
                />
              )}
              {'ajuda' in c && c.ajuda && <span className="ajuda">{c.ajuda}</span>}
            </div>
          )
        })}
        {props.extra}
        <div className="mfoot">
          <button type="button" className="btn" onClick={fechar}>Cancelar</button>
          <button className="btn primary" disabled={salvando}>{salvando ? 'Salvando…' : (props.rotuloSalvar ?? 'Salvar')}</button>
        </div>
      </form>
    </>
  )
}

/** Erro de validação mostrado como toast pelo Formulario. */
export function erroValidacao(mensagem: string): Error {
  const e = new Error(mensagem)
  e.name = 'Validacao'
  return e
}
