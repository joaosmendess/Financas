-- Importar uma planilha sem lançamentos (ex.: só metas ou só dívidas) não pode apagar
-- os lançamentos do mês. Só substitui quando a planilha traz lançamentos.
create or replace function public.importar_fatura(
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
  v_lanc int := 0;
  v_div int;
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;

  if jsonb_array_length(coalesce(p_lancamentos, '[]'::jsonb)) > 0 then
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
      from jsonb_array_elements(p_lancamentos) as x;
    get diagnostics v_lanc = row_count;
  end if;

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
