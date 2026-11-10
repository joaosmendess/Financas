-- RLS: só o dono lê e escreve. Nada é acessível sem login (role anon).

do $$
declare
  t text;
begin
  foreach t in array array['config', 'pessoas', 'lancamentos', 'contas_fixas', 'dividas', 'metas', 'pagamentos_mes']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy "só o dono lê e escreve" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end
$$;
