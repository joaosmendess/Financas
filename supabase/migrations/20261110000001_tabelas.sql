-- Tabelas do Minhas Finanças.
-- Todas têm user_id (default auth.uid()) e created_at. Valores em centavos (bigint).
-- Meses no formato 'YYYY-MM'.

-- Uma linha por usuário.
create table public.config (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  renda_centavos bigint not null default 0 check (renda_centavos >= 0),
  cartao_nome    text not null default 'Itaú Platinum',
  dia_fechamento smallint not null default 2 check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null default 9 check (dia_vencimento between 1 and 31),
  created_at     timestamptz not null default now()
);

create table public.pessoas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome       text not null check (length(trim(nome)) > 0),
  cor        text not null default '#2563EB' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  -- Outros nomes da pessoa, usados na importação (ex.: "José Valter" para o Painho).
  apelidos   text[] not null default '{}',
  created_at timestamptz not null default now(),
  -- Permite que dividas referencie (id, user_id) e não aponte para pessoa de outro usuário.
  unique (id, user_id)
);
create index pessoas_user_idx on public.pessoas (user_id);

create table public.lancamentos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes_fatura     text not null check (mes_fatura ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  data_compra    date,
  descricao      text not null check (length(trim(descricao)) > 0),
  -- Pode ser negativo (estorno).
  valor_centavos bigint not null,
  parcela        text check (parcela ~ '^\d{2,3}/\d{2,3}$'),
  categoria      text,
  -- 'eu' ou o id (uuid) de uma pessoa.
  dono           text not null default 'eu'
                 check (dono = 'eu' or dono ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  recebido       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index lancamentos_user_mes_idx on public.lancamentos (user_id, mes_fatura);

create table public.contas_fixas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome           text not null check (length(trim(nome)) > 0),
  valor_centavos bigint not null check (valor_centavos >= 0),
  dia            smallint not null default 5 check (dia between 1 and 31),
  ativa          boolean not null default true,
  created_at     timestamptz not null default now()
);
create index contas_fixas_user_idx on public.contas_fixas (user_id);

create table public.dividas (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  pessoa_id      uuid not null,
  descricao      text not null check (length(trim(descricao)) > 0),
  valor_centavos bigint not null check (valor_centavos >= 0),
  mes            text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- 'me_deve': recebido = já recebi. 'eu_devo': recebido = já paguei.
  recebido       boolean not null default false,
  direcao        text not null default 'me_deve' check (direcao in ('me_deve', 'eu_devo')),
  created_at     timestamptz not null default now(),
  foreign key (pessoa_id, user_id) references public.pessoas (id, user_id) on delete cascade
);
create index dividas_user_idx on public.dividas (user_id);
create index dividas_pessoa_idx on public.dividas (pessoa_id);

create table public.metas (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  emoji           text not null default '🎯',
  nome            text not null check (length(trim(nome)) > 0),
  alvo_centavos   bigint not null check (alvo_centavos >= 0),
  atual_centavos  bigint not null default 0 check (atual_centavos >= 0),
  mensal_centavos bigint not null default 0 check (mensal_centavos >= 0),
  prazo           text check (prazo ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  dia             smallint not null default 10 check (dia between 1 and 31),
  created_at      timestamptz not null default now()
);
create index metas_user_idx on public.metas (user_id);

-- O que já foi pago em cada mês. item_chave: 'fatura', 'c:<conta_id>' ou 'm:<meta_id>'.
create table public.pagamentos_mes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes        text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  item_chave text not null check (item_chave = 'fatura' or item_chave ~ '^[cm]:.+$'),
  pago       boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, mes, item_chave)
);
