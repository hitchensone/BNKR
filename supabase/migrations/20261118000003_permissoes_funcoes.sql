-- =====================================================================
-- Fecha a API das funções SECURITY DEFINER.
-- Funções de gatilho: ninguém chama pela API (o banco chama sozinho).
-- Funções de permissão e claim_ownership: só usuários logados, pois
-- as políticas de RLS e o primeiro acesso dependem delas.
-- =====================================================================

revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.leads_stage_change() from public, anon, authenticated;
revoke execute on function public.contracts_on_sign()  from public, anon, authenticated;

revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_staff()                from public, anon;
revoke execute on function public.is_admin()                from public, anon;
revoke execute on function public.is_client_member(uuid)    from public, anon;
revoke execute on function public.claim_ownership()         from public, anon;

grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_staff()                to authenticated;
grant execute on function public.is_admin()                to authenticated;
grant execute on function public.is_client_member(uuid)    to authenticated;
grant execute on function public.claim_ownership()         to authenticated;
