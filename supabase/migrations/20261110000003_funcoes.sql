-- Funções que precisam ser atômicas. Todas são SECURITY INVOKER: rodam com o RLS do usuário.

-- Ao excluir uma pessoa, os lançamentos dela voltam a ser meus.
-- (As dívidas dela são apagadas pela FK com on delete cascade.)
create function public.pessoa_excluida()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lancamentos
     set dono = 'eu', recebido = false
   where user_id = old.user_id and dono = old.id::text;
  return old;
end;
$$;

create trigger pessoas_antes_de_excluir
before delete on public.pessoas
for each row execute function public.pessoa_excluida();

-- Marca/desmarca um item de "Contas a pagar". Se for meta ('m:<id>'),
-- soma o mensal no valor guardado ao marcar e subtrai ao desmarcar.
-- Devolve o novo estado (true = pago).
create function public.alternar_pagamento(p_mes text, p_chave text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pago boolean;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;

  insert into public.pagamentos_mes (mes, item_chave, pago)
  values (p_mes, p_chave, true)
  on conflict (user_id, mes, item_chave)
  do update set pago = not public.pagamentos_mes.pago
  returning pago into v_pago;

  if p_chave like 'm:%' then
    update public.metas
       set atual_centavos = greatest(0, atual_centavos + case when v_pago then mensal_centavos else -mensal_centavos end)
     where id = substring(p_chave from 3)::uuid;
  end if;

  return v_pago;
end;
$$;

-- Grava uma importação de planilha numa transação:
--  * substitui os lançamentos do mês;
--  * insere as dívidas que ainda não existem (mesma pessoa, direção, descrição e valor);
--  * grava a renda se ainda não houver renda definida.
-- p_lancamentos: [{data_compra, descricao, valor_centavos, parcela, categoria, dono, recebido}]
-- p_dividas:     [{pessoa_id, descricao, valor_centavos, mes, recebido, direcao}]
create function public.importar_fatura(
  p_mes text,
  p_lancamentos jsonb,
  p_dividas jsonb,
  p_renda_centavos bigint default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_lanc int;
  v_div int;
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;

  delete from public.lancamentos where user_id = v_uid and mes_fatura = p_mes;

  insert into public.lancamentos (mes_fatura, data_compra, descricao, valor_centavos, parcela, categoria, dono, recebido)
  select p_mes,
         nullif(x ->> 'data_compra', '')::date,
         x ->> 'descricao',
         (x ->> 'valor_centavos')::bigint,
         nullif(x ->> 'parcela', ''),
         nullif(x ->> 'categoria', ''),
         coalesce(nullif(x ->> 'dono', ''), 'eu'),
         coalesce((x ->> 'recebido')::boolean, false)
    from jsonb_array_elements(coalesce(p_lancamentos, '[]'::jsonb)) as x;
  get diagnostics v_lanc = row_count;

  insert into public.dividas (pessoa_id, descricao, valor_centavos, mes, recebido, direcao)
  select (x ->> 'pessoa_id')::uuid,
         trim(x ->> 'descricao'),
         (x ->> 'valor_centavos')::bigint,
         coalesce(nullif(x ->> 'mes', ''), p_mes),
         coalesce((x ->> 'recebido')::boolean, false),
         coalesce(nullif(x ->> 'direcao', ''), 'me_deve')
    from jsonb_array_elements(coalesce(p_dividas, '[]'::jsonb)) as x
   where not exists (
     select 1 from public.dividas d
      where d.user_id = v_uid
        and d.pessoa_id = (x ->> 'pessoa_id')::uuid
        and d.direcao = coalesce(nullif(x ->> 'direcao', ''), 'me_deve')
        and lower(trim(d.descricao)) = lower(trim(x ->> 'descricao'))
        and d.valor_centavos = (x ->> 'valor_centavos')::bigint
   );
  get diagnostics v_div = row_count;

  if p_renda_centavos is not null and p_renda_centavos > 0 then
    insert into public.config (renda_centavos) values (p_renda_centavos)
    on conflict (user_id) do update
      set renda_centavos = case when public.config.renda_centavos = 0
                                then excluded.renda_centavos
                                else public.config.renda_centavos end;
  end if;

  return jsonb_build_object('lancamentos', v_lanc, 'dividas', v_div);
end;
$$;

-- "Recebi tudo": marca como recebido tudo o que a pessoa me deve.
create function public.receber_tudo(p_pessoa uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.lancamentos set recebido = true
   where user_id = auth.uid() and dono = p_pessoa::text and not recebido;
  update public.dividas set recebido = true
   where user_id = auth.uid() and pessoa_id = p_pessoa and direcao = 'me_deve' and not recebido;
end;
$$;

-- "Apagar tudo" em Ajustes. A configuração volta ao padrão.
create function public.apagar_tudo()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;
  delete from public.pagamentos_mes where user_id = v_uid;
  delete from public.dividas where user_id = v_uid;
  delete from public.lancamentos where user_id = v_uid;
  delete from public.contas_fixas where user_id = v_uid;
  delete from public.metas where user_id = v_uid;
  delete from public.pessoas where user_id = v_uid;
  delete from public.config where user_id = v_uid;
end;
$$;

revoke execute on function public.alternar_pagamento(text, text) from public, anon;
revoke execute on function public.importar_fatura(text, jsonb, jsonb, bigint) from public, anon;
revoke execute on function public.receber_tudo(uuid) from public, anon;
revoke execute on function public.apagar_tudo() from public, anon;
grant execute on function public.alternar_pagamento(text, text) to authenticated;
grant execute on function public.importar_fatura(text, jsonb, jsonb, bigint) to authenticated;
grant execute on function public.receber_tudo(uuid) to authenticated;
grant execute on function public.apagar_tudo() to authenticated;
