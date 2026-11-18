-- =====================================================================
-- Lista da equipe (para atribuir demandas). Devolve só nome e papel,
-- e só para quem é da equipe. Clientes não enxergam.
-- =====================================================================
create or replace function public.list_staff()
returns table (user_id uuid, full_name text, role public.app_role)
language sql
stable
security definer
set search_path = ''
as $$
  select r.user_id, p.full_name, r.role
    from public.user_roles r
    left join public.profiles p on p.id = r.user_id
   where r.role in ('owner', 'admin', 'team')
     and public.is_staff()
   order by p.full_name;
$$;

revoke execute on function public.list_staff() from public, anon;
grant  execute on function public.list_staff() to authenticated;
