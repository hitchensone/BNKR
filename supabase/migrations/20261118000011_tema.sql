-- =====================================================================
-- GO Bunker! · Ajustes: tema escolhido por cada pessoa
-- Vale em qualquer aparelho em que ela entrar.
-- =====================================================================
alter table public.profiles
  add column theme text not null default 'padrao'
  check (theme in ('padrao', 'dark', 'glass', 'glass-ish', 'liquid'));
