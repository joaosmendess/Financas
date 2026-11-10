// Roda as migrations num Postgres em memória (PGlite) simulando o ambiente do Supabase
// (schema auth, auth.uid(), papéis anon/authenticated) e testa RLS e funções.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  insert into auth.users values ('${A}'), ('${B}');
`

let db: PGlite

/** Executa SQL como um usuário logado (ou como anon se uid = null). */
async function como<T = Record<string, unknown>>(uid: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false);`)
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`)
  try {
    return (await db.query<T>(sql, params)).rows
  } finally {
    await db.exec('reset role')
  }
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUB)
  const dir = join(import.meta.dirname, 'migrations')
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'))
  }
})
afterAll(() => db.close())
beforeEach(async () => {
  await db.exec('reset role; truncate public.config, public.pessoas, public.lancamentos, public.contas_fixas, public.dividas, public.metas, public.pagamentos_mes cascade')
})

async function novaPessoa(uid: string, nome: string) {
  const [p] = await como<{ id: string }>(uid, `insert into pessoas (nome) values ($1) returning id`, [nome])
  return p!.id
}

describe('RLS', () => {
  it('cada usuário só vê os próprios dados', async () => {
    await como(A, `insert into lancamentos (mes_fatura, descricao, valor_centavos) values ('2026-12', 'UBER', 590)`)
    await como(B, `insert into lancamentos (mes_fatura, descricao, valor_centavos) values ('2026-12', 'OUTBACK', 3093)`)
    expect(await como(A, 'select descricao from lancamentos')).toEqual([{ descricao: 'UBER' }])
    expect(await como(B, 'select descricao from lancamentos')).toEqual([{ descricao: 'OUTBACK' }])
  })

  it('user_id vem do login e não dá para gravar em nome de outro', async () => {
    const [r] = await como<{ user_id: string }>(A, `insert into metas (nome, alvo_centavos) values ('Reserva', 100) returning user_id`)
    expect(r!.user_id).toBe(A)
    await expect(
      como(A, `insert into metas (user_id, nome, alvo_centavos) values ('${B}', 'X', 1)`),
    ).rejects.toThrow(/row-level security/)
  })

  it('não altera nem apaga dados de outro usuário', async () => {
    await como(B, `insert into contas_fixas (nome, valor_centavos) values ('Luz', 17000)`)
    await como(A, `update contas_fixas set valor_centavos = 1`)
    await como(A, `delete from contas_fixas`)
    expect(await como(B, 'select valor_centavos from contas_fixas')).toEqual([{ valor_centavos: 17000 }])
  })

  it('anon não acessa nada', async () => {
    await expect(como(null, 'select * from lancamentos')).rejects.toThrow(/permission denied/)
  })

  it('dívida não pode apontar para pessoa de outro usuário', async () => {
    const deB = await novaPessoa(B, 'Pessoa do B')
    await expect(
      como(A, `insert into dividas (pessoa_id, descricao, valor_centavos, mes) values ($1, 'x', 1, '2026-12')`, [deB]),
    ).rejects.toThrow(/foreign key/)
  })
})

describe('validações', () => {
  it('rejeita mês, dia, parcela e dono inválidos', async () => {
    const ins = (cols: string, vals: string) => como(A, `insert into lancamentos (descricao, valor_centavos, ${cols}) values ('x', 1, ${vals})`)
    await expect(ins('mes_fatura', `'2026-13'`)).rejects.toThrow(/check/)
    await expect(ins('mes_fatura, parcela', `'2026-12', '2/10'`)).rejects.toThrow(/check/)
    await expect(ins('mes_fatura, dono', `'2026-12', 'pai'`)).rejects.toThrow(/check/)
    await expect(como(A, `insert into contas_fixas (nome, valor_centavos, dia) values ('x', 1, 32)`)).rejects.toThrow(/check/)
    await expect(ins('mes_fatura, parcela', `'2026-12', '02/10'`)).resolves.toBeDefined()
  })
})

describe('excluir pessoa', () => {
  it('lançamentos voltam a ser meus e as dívidas dela somem', async () => {
    const pai = await novaPessoa(A, 'Painho')
    await como(A, `insert into lancamentos (mes_fatura, descricao, valor_centavos, dono, recebido) values ('2026-12', 'TV', 11645, $1, true)`, [pai])
    await como(A, `insert into dividas (pessoa_id, descricao, valor_centavos, mes) values ($1, 'Pix', 15000, '2026-12')`, [pai])
    await como(A, `delete from pessoas where id = $1`, [pai])
    expect(await como(A, 'select dono, recebido from lancamentos')).toEqual([{ dono: 'eu', recebido: false }])
    expect(await como(A, 'select * from dividas')).toEqual([])
  })
})

describe('alternar_pagamento', () => {
  it('marca, desmarca e ajusta o guardado da meta', async () => {
    const [m] = await como<{ id: string }>(A, `insert into metas (nome, alvo_centavos, atual_centavos, mensal_centavos) values ('Reserva', 1100000, 240000, 70000) returning id`)
    const chave = `m:${m!.id}`
    const alternar = async () => (await como<{ p: boolean }>(A, `select alternar_pagamento('2026-12', $1) as p`, [chave]))[0]!.p
    expect(await alternar()).toBe(true)
    expect(await como(A, 'select atual_centavos from metas')).toEqual([{ atual_centavos: 310000 }])
    expect(await alternar()).toBe(false)
    expect(await como(A, 'select atual_centavos from metas')).toEqual([{ atual_centavos: 240000 }])
  })

  it('conta fixa e fatura só gravam o estado', async () => {
    await como(A, `select alternar_pagamento('2026-12', 'fatura')`)
    expect(await como(A, `select mes, item_chave, pago from pagamentos_mes`)).toEqual([{ mes: '2026-12', item_chave: 'fatura', pago: true }])
    // outro usuário tem o próprio estado
    await como(B, `select alternar_pagamento('2026-12', 'fatura')`)
    expect(await como(B, `select pago from pagamentos_mes`)).toEqual([{ pago: true }])
  })
})

describe('importar_fatura', () => {
  it('substitui o mês, não duplica dívidas e grava a renda só se estiver zerada', async () => {
    const pai = await novaPessoa(A, 'Painho')
    await como(A, `insert into lancamentos (mes_fatura, descricao, valor_centavos) values ('2026-12', 'ANTIGO', 1), ('2026-11', 'NOVEMBRO', 2)`)
    const lancs = JSON.stringify([
      { data_compra: '2026-10-17', descricao: 'C&A', valor_centavos: 6999, parcela: '02/02', categoria: 'Vestuário', dono: pai },
      { data_compra: null, descricao: 'UBER', valor_centavos: 590, parcela: '', categoria: 'Transporte' },
    ])
    const divs = JSON.stringify([{ pessoa_id: pai, descricao: 'Pix emprestado', valor_centavos: 15000 }])
    const importar = () => como<{ r: { lancamentos: number; dividas: number } }>(
      A, `select importar_fatura('2026-12', $1::jsonb, $2::jsonb, 640000) as r`, [lancs, divs])

    expect((await importar())[0]!.r).toEqual({ lancamentos: 2, dividas: 1 })
    expect(await como(A, `select descricao, parcela, dono = 'eu' as meu from lancamentos order by mes_fatura, descricao`)).toEqual([
      { descricao: 'NOVEMBRO', parcela: null, meu: true },
      { descricao: 'C&A', parcela: '02/02', meu: false },
      { descricao: 'UBER', parcela: null, meu: true },
    ])
    expect(await como(A, 'select renda_centavos from config')).toEqual([{ renda_centavos: 640000 }])

    // Segunda importação: dívida igual não duplica; renda existente não muda.
    await como(A, `update config set renda_centavos = 700000`)
    expect((await importar())[0]!.r).toEqual({ lancamentos: 2, dividas: 0 })
    expect(await como(A, 'select renda_centavos from config')).toEqual([{ renda_centavos: 700000 }])
    expect(await como(A, `select count(*)::int as n from lancamentos where mes_fatura = '2026-12'`)).toEqual([{ n: 2 }])
  })
})

describe('importar sem lançamentos', () => {
  it('não apaga os lançamentos do mês quando a planilha não traz nenhum', async () => {
    await como(A, `insert into lancamentos (mes_fatura, descricao, valor_centavos) values ('2026-12', 'FICA', 100)`)
    const [r] = await como<{ r: unknown }>(A, `select importar_fatura('2026-12', '[]'::jsonb, '[]'::jsonb) as r`)
    expect(r!.r).toEqual({ lancamentos: 0, dividas: 0 })
    expect(await como(A, 'select descricao from lancamentos')).toEqual([{ descricao: 'FICA' }])
  })
})

describe('receber_tudo e apagar_tudo', () => {
  it('receber_tudo marca só o que a pessoa me deve', async () => {
    const pai = await novaPessoa(A, 'Painho')
    await como(A, `insert into lancamentos (mes_fatura, descricao, valor_centavos, dono) values ('2026-12', 'TV', 11645, $1), ('2026-12', 'MEU', 1, 'eu')`, [pai])
    await como(A, `insert into dividas (pessoa_id, descricao, valor_centavos, mes, direcao) values ($1, 'Pix', 15000, '2026-12', 'me_deve'), ($1, 'Eu devo', 5000, '2026-12', 'eu_devo')`, [pai])
    await como(A, `select receber_tudo($1)`, [pai])
    expect(await como(A, `select descricao, recebido from lancamentos order by descricao`)).toEqual([
      { descricao: 'MEU', recebido: false },
      { descricao: 'TV', recebido: true },
    ])
    expect(await como(A, `select direcao, recebido from dividas order by direcao`)).toEqual([
      { direcao: 'eu_devo', recebido: false },
      { direcao: 'me_deve', recebido: true },
    ])
  })

  it('apagar_tudo limpa só os meus dados', async () => {
    await novaPessoa(A, 'Painho')
    await novaPessoa(B, 'Outra')
    await como(A, `insert into config default values`)
    await como(A, `select apagar_tudo()`)
    expect(await como(A, 'select * from pessoas')).toEqual([])
    expect(await como(A, 'select * from config')).toEqual([])
    expect((await como(B, 'select nome from pessoas')).length).toBe(1)
  })
})
