// Modais de cadastro/edição. Cada um usa o Formulario genérico e uma mutação.
import { Avatar } from '@/components/Avatar'
import { useDialogo } from '@/components/Dialogo'
import { ModalTitulo } from '@/components/ui/dialog'
import { erroValidacao, Formulario, type Valores } from '@/components/Formulario'
import { usePessoas } from '@/data/consultas'
import { Importar } from '@/features/importar/Importar'
import {
  useAtualizarGuardado, useDividirLancamento, useSalvarConfig, useSalvarConta, useSalvarDivida, useSalvarLancamento,
  useSalvarMeta, useSalvarPessoa,
} from '@/data/mutacoes'
import { CATEGORIAS, categoria } from '@/domain/categoria'
import { formatar, paraCampo } from '@/domain/dinheiro'
import { iconeMeta } from '@/domain/icones'
import { depositar, retirar } from '@/domain/metas'
import { nomeMesAno } from '@/domain/meses'
import { normalizarParcela } from '@/domain/parcelas'
import {
  EU, type ContaFixa, type DirecaoDivida, type Divida, type Lancamento, type Mes, type Meta, type Pessoa,
} from '@/domain/tipos'

type V = Valores[string] | undefined
const txt = (v: V) => (typeof v === 'string' ? v : '')
const num = (v: V, padrao = 0) => (typeof v === 'number' ? v : padrao)
const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function donoOpcoes(pessoas: readonly Pessoa[]) {
  return [[EU, 'Eu'], ...pessoas.map((p) => [p.id, p.nome] as const)] as const
}

// ---------- lançamento ----------

export function FormLancamento({ mes, lancamento }: { mes: Mes; lancamento?: Lancamento }) {
  const { data: pessoas = [] } = usePessoas()
  const salvar = useSalvarLancamento()
  const l = lancamento
  return (
    <Formulario
      titulo={l ? 'Editar lançamento' : 'Novo lançamento'}
      descricao={`Fatura de ${nomeMesAno(l?.mes_fatura ?? mes)}`}
      campos={[
        { nome: 'descricao', rotulo: 'Descrição', obrigatorio: true },
        { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true, ajuda: 'Negativo para estorno.' },
        { nome: 'data', rotulo: 'Data da compra', tipo: 'date' },
        { nome: 'parcela', rotulo: 'Parcela (ex.: 02/10)', placeholder: 'à vista' },
        {
          nome: 'categoria', rotulo: 'Categoria', tipo: 'select',
          opcoes: [['', 'Automática'], ...CATEGORIAS.map((c) => [c.nome, c.nome] as const)],
        },
        { nome: 'dono', rotulo: 'De quem é', tipo: 'select', opcoes: donoOpcoes(pessoas) },
      ]}
      inicial={{
        descricao: l?.descricao ?? '',
        valor: l ? paraCampo(l.valor_centavos) : '',
        data: l?.data_compra ?? hojeISO(),
        parcela: l?.parcela ?? '',
        categoria: l?.categoria && CATEGORIAS.some((c) => c.nome === l.categoria) ? l.categoria : '',
        dono: l?.dono ?? EU,
      }}
      aoSalvar={(v) => {
        const desc = txt(v.descricao)
        const parcelaTxt = txt(v.parcela)
        const parcela = parcelaTxt ? normalizarParcela(parcelaTxt) : null
        if (parcelaTxt && !parcela) throw erroValidacao('Parcela no formato 02/10')
        if (num(v.valor) === 0) throw erroValidacao('Informe o valor')
        const dono = txt(v.dono) || EU
        return salvar.mutateAsync({
          id: l?.id,
          mes_fatura: l?.mes_fatura ?? mes,
          descricao: desc,
          valor_centavos: num(v.valor),
          data_compra: txt(v.data) || null,
          parcela,
          categoria: txt(v.categoria) || categoria(desc),
          dono,
          // Trocar o dono zera o "recebido", como no protótipo.
          recebido: l && l.dono === dono ? l.recebido : false,
        })
      }}
    />
  )
}

/** Divide uma compra: parte fica comigo, parte vai para outra pessoa. */
export function FormDividir({ lancamento }: { lancamento: Lancamento }) {
  const { data: pessoas = [] } = usePessoas()
  const dividir = useDividirLancamento()
  if (!pessoas.length) return <SemPessoas />
  return (
    <Formulario
      titulo="Dividir compra"
      descricao={`${lancamento.descricao} · ${formatar(lancamento.valor_centavos)}. A parte da pessoa vira um lançamento separado, que entra em Quem me deve.`}
      campos={[
        { nome: 'dono', rotulo: 'Com quem', tipo: 'select', opcoes: pessoas.map((p) => [p.id, p.nome] as const) },
        { nome: 'parte', rotulo: 'Parte dela (R$)', tipo: 'dinheiro', obrigatorio: true, positivo: true },
      ]}
      inicial={{ dono: pessoas[0]!.id, parte: paraCampo(Math.round(lancamento.valor_centavos / 2)) }}
      rotuloSalvar="Dividir"
      aoSalvar={(v) => {
        const parte = num(v.parte)
        if (parte <= 0 || parte >= lancamento.valor_centavos) throw erroValidacao('A parte tem que ser menor que o valor da compra')
        return dividir.mutateAsync({ lancamento, parte, dono: txt(v.dono) })
      }}
    />
  )
}

// ---------- conta fixa ----------

export function FormConta({ conta }: { conta?: ContaFixa }) {
  const salvar = useSalvarConta()
  return (
    <Formulario
      titulo={conta ? 'Editar conta fixa' : 'Nova conta fixa'}
      descricao="Contas que se repetem todo mês."
      campos={[
        { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
        { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true, positivo: true },
        { nome: 'dia', rotulo: 'Dia do vencimento', tipo: 'number', min: 1, max: 31 },
        ...(conta ? [{ nome: 'ativa', rotulo: 'Ativa (entra no saldo e em Contas a pagar)', tipo: 'check' as const }] : []),
      ]}
      inicial={{
        nome: conta?.nome ?? '',
        valor: conta ? paraCampo(conta.valor_centavos) : '',
        dia: String(conta?.dia ?? 5),
        ativa: conta?.ativa ?? true,
      }}
      aoSalvar={(v) =>
        salvar.mutateAsync({
          id: conta?.id,
          nome: txt(v.nome),
          valor_centavos: num(v.valor),
          dia: num(v.dia, 5),
          ativa: conta ? v.ativa === true : true,
        })
      }
    />
  )
}

// ---------- dívidas ----------

function SemPessoas() {
  const { abrir, fechar } = useDialogo()
  return (
    <>
      <ModalTitulo>Cadastre uma pessoa</ModalTitulo>
      <p>Para registrar quem te deve ou a quem você deve, cadastre a pessoa primeiro.</p>
      <div className="mfoot">
        <button type="button" className="btn" onClick={fechar}>Cancelar</button>
        <button type="button" className="btn primary" onClick={() => abrir(<FormPessoa />)}>Adicionar pessoa</button>
      </div>
    </>
  )
}

export function FormDivida({ mes, direcao, divida }: { mes: Mes; direcao: DirecaoDivida; divida?: Divida }) {
  const { data: pessoas = [] } = usePessoas()
  const salvar = useSalvarDivida()
  if (!pessoas.length) return <SemPessoas />
  const meDeve = (divida?.direcao ?? direcao) === 'me_deve'
  return (
    <Formulario
      titulo={divida ? 'Editar dívida' : meDeve ? 'Alguém me deve' : 'Eu devo a alguém'}
      descricao={meDeve ? 'Para valores fora do cartão, como um Pix que você emprestou.' : 'O que você deve entra no saldo previsto do mês.'}
      campos={[
        { nome: 'pessoa', rotulo: 'Quem', tipo: 'select', opcoes: pessoas.map((p) => [p.id, p.nome] as const) },
        { nome: 'descricao', rotulo: 'Descrição', obrigatorio: true },
        { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true, positivo: true },
        { nome: 'mes', rotulo: 'Mês', tipo: 'month', obrigatorio: true },
      ]}
      inicial={{
        pessoa: divida?.pessoa_id ?? pessoas[0]!.id,
        descricao: divida?.descricao ?? '',
        valor: divida ? paraCampo(divida.valor_centavos) : '',
        mes: divida?.mes ?? mes,
      }}
      aoSalvar={(v) => {
        if (num(v.valor) <= 0) throw erroValidacao('Informe o valor')
        return salvar.mutateAsync({
          id: divida?.id,
          pessoa_id: txt(v.pessoa),
          descricao: txt(v.descricao),
          valor_centavos: num(v.valor),
          mes: txt(v.mes) || mes,
          recebido: divida?.recebido ?? false,
          direcao: divida?.direcao ?? direcao,
        })
      }}
    />
  )
}

// ---------- metas ----------

export function FormMeta({ meta }: { meta?: Meta }) {
  const salvar = useSalvarMeta()
  return (
    <Formulario
      titulo={meta ? 'Editar meta' : 'Nova meta'}
      campos={[
        { nome: 'emoji', rotulo: 'Ícone', tipo: 'icone' },
        { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
        { nome: 'alvo', rotulo: 'Quanto quer juntar (R$)', tipo: 'dinheiro', obrigatorio: true, positivo: true },
        { nome: 'atual', rotulo: 'Quanto já tem (R$)', tipo: 'dinheiro', positivo: true },
        { nome: 'mensal', rotulo: 'Quanto guardar por mês (R$)', tipo: 'dinheiro', positivo: true },
        { nome: 'prazo', rotulo: 'Prazo', tipo: 'month' },
        { nome: 'dia', rotulo: 'Dia de guardar', tipo: 'number', min: 1, max: 31 },
      ]}
      inicial={{
        emoji: iconeMeta(meta?.emoji),
        nome: meta?.nome ?? '',
        alvo: meta ? paraCampo(meta.alvo_centavos) : '',
        atual: meta ? paraCampo(meta.atual_centavos) : '',
        mensal: meta ? paraCampo(meta.mensal_centavos) : '',
        prazo: meta?.prazo ?? '',
        dia: String(meta?.dia ?? 10),
      }}
      aoSalvar={(v) =>
        salvar.mutateAsync({
          id: meta?.id,
          emoji: iconeMeta(txt(v.emoji)),
          nome: txt(v.nome),
          alvo_centavos: num(v.alvo),
          atual_centavos: num(v.atual),
          mensal_centavos: num(v.mensal),
          prazo: txt(v.prazo) || null,
          dia: num(v.dia, 10),
        })
      }
    />
  )
}

/** "Guardar valor" ou "Retirar" de uma meta. */
export function FormMovimentoMeta({ meta, tipo }: { meta: Meta; tipo: 'guardar' | 'retirar' }) {
  const atualizar = useAtualizarGuardado()
  const guardar = tipo === 'guardar'
  return (
    <Formulario
      titulo={`${guardar ? 'Guardar em' : 'Retirar de'} ${meta.nome}`}
      descricao={guardar ? 'Some um valor ao que já está guardado.' : 'Tire um valor do que está guardado.'}
      campos={[{ nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true, positivo: true }]}
      inicial={{}}
      rotuloSalvar={guardar ? 'Guardar' : 'Retirar'}
      aoSalvar={(v) => {
        const valor = num(v.valor)
        if (valor <= 0) throw erroValidacao('Informe um valor válido')
        return atualizar.mutateAsync({ id: meta.id, atual_centavos: guardar ? depositar(meta, valor) : retirar(meta, valor) })
      }}
    />
  )
}

// ---------- pessoas ----------

const CORES = ['#2563EB', '#E5466F', '#0EA5A4', '#B45309', '#7C3AED', '#15803D']

export function FormPessoa({ pessoa }: { pessoa?: Pessoa }) {
  const { data: pessoas = [] } = usePessoas()
  const salvar = useSalvarPessoa()
  return (
    <Formulario
      titulo={pessoa ? 'Editar pessoa' : 'Nova pessoa'}
      descricao="Quem usa seu cartão, te deve ou a quem você deve."
      campos={[
        { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
        { nome: 'cor', rotulo: 'Cor', tipo: 'color' },
        { nome: 'apelidos', rotulo: 'Outros nomes (separados por vírgula)', ajuda: 'Como a pessoa aparece na planilha, ex.: José Valter' },
      ]}
      inicial={{
        nome: pessoa?.nome ?? '',
        cor: pessoa?.cor ?? CORES[pessoas.length % CORES.length]!,
        apelidos: (pessoa?.apelidos ?? []).join(', '),
      }}
      aoSalvar={(v) =>
        salvar.mutateAsync({
          id: pessoa?.id,
          nome: txt(v.nome),
          cor: (txt(v.cor) || '#2563EB').toUpperCase(),
          apelidos: txt(v.apelidos).split(',').map((s) => s.trim()).filter(Boolean),
        })
      }
    />
  )
}

// ---------- renda ----------

export function FormRenda({ renda }: { renda: number }) {
  const salvar = useSalvarConfig()
  return (
    <Formulario
      titulo="Renda mensal"
      descricao="Quanto entra por mês, já líquido."
      campos={[{ nome: 'renda', rotulo: 'Renda (R$)', tipo: 'dinheiro', obrigatorio: true, positivo: true }]}
      inicial={{ renda: renda ? paraCampo(renda) : '' }}
      aoSalvar={(v) => salvar.mutateAsync({ renda_centavos: num(v.renda) })}
    />
  )
}

/** Atalho para listas de pessoas com avatar (usado em telas). */
export function NomePessoa({ pessoa }: { pessoa: Pessoa }) {
  return (
    <span className="row">
      <Avatar pessoa={pessoa} />
      {pessoa.nome}
    </span>
  )
}

/** Abre o modal certo para cada item do menu Adicionar. */
export function useAdicionar(mes: Mes) {
  const { abrir } = useDialogo()
  return (tipo: 'lanc' | 'conta' | 'me_deve' | 'eu_devo' | 'meta' | 'pessoa' | 'import') => {
    if (tipo === 'lanc') abrir(<FormLancamento mes={mes} />)
    else if (tipo === 'conta') abrir(<FormConta />)
    else if (tipo === 'me_deve' || tipo === 'eu_devo') abrir(<FormDivida mes={mes} direcao={tipo} />)
    else if (tipo === 'meta') abrir(<FormMeta />)
    else if (tipo === 'pessoa') abrir(<FormPessoa />)
    else abrir(<Importar mes={mes} />)
  }
}
