-- =====================================================================
-- GO Bunker! · GO UP — Postagens (parte 2)
-- Calendário de posts por projeto, aprovação do cliente pelo GO THERE
-- e métricas para estatísticas.
-- =====================================================================

create table public.posts (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  task_id            uuid references public.tasks (id) on delete set null,
  network            text not null check (network in ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x', 'threads', 'pinterest')),
  format             text not null check (format in ('feed', 'carrossel', 'reels', 'stories', 'video', 'texto')),
  title              text not null,                 -- nome interno do post
  caption            text,
  scheduled_at       timestamptz,
  status             text not null default 'ideia'
                     check (status in ('ideia', 'producao', 'aprovacao', 'ajustes', 'aprovado', 'agendado', 'publicado')),
  media_file_id      uuid references public.files (id) on delete set null,
  client_feedback    text,
  reviewed_at        timestamptz,
  reviewed_by        uuid references auth.users (id) on delete set null,
  published_url      text,
  published_at       timestamptz,
  -- métricas (preenchidas depois de publicado)
  reach              integer check (reach >= 0),
  impressions        integer check (impressions >= 0),
  likes              integer check (likes >= 0),
  comments           integer check (comments >= 0),
  shares             integer check (shares >= 0),
  saves              integer check (saves >= 0),
  views              integer check (views >= 0),
  metrics_updated_at timestamptz,
  created_by         uuid references auth.users (id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index posts_project_idx on public.posts (project_id, scheduled_at);
create index posts_scheduled_idx on public.posts (scheduled_at);
create index posts_status_idx on public.posts (status);

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Publicado → guarda a data de publicação
create or replace function public.posts_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status is distinct from 'publicado') then
    new.published_at = coalesce(new.published_at, new.scheduled_at, now());
  end if;
  return new;
end;
$$;

create trigger posts_published
  before insert or update of status on public.posts
  for each row execute function public.posts_published();

-- Aprovação pelo cliente: só posts do próprio projeto e aguardando aprovação.
create or replace function public.review_post(_post_id uuid, _approve boolean, _feedback text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_status text;
begin
  select project_id, status into v_project, v_status from public.posts where id = _post_id;
  if v_project is null or not public.can_see_project(v_project) then
    raise exception 'Post não encontrado.';
  end if;
  if v_status <> 'aprovacao' then
    raise exception 'Este post não está aguardando aprovação.';
  end if;
  if not _approve and coalesce(trim(_feedback), '') = '' then
    raise exception 'Conte o que precisa ajustar.';
  end if;

  update public.posts
     set status = case when _approve then 'aprovado' else 'ajustes' end,
         client_feedback = nullif(trim(_feedback), ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = _post_id;
end;
$$;

alter table public.posts enable row level security;

create policy "equipe gerencia posts" on public.posts
  for all using (public.is_staff()) with check (public.is_staff());

-- O cliente vê a partir da aprovação (nunca ideias e rascunhos).
create policy "cliente vê posts" on public.posts
  for select using (
    status in ('aprovacao', 'ajustes', 'aprovado', 'agendado', 'publicado')
    and public.can_see_project(project_id)
  );

revoke execute on function public.posts_published() from public, anon, authenticated;
revoke execute on function public.review_post(uuid, boolean, text) from public, anon;
grant  execute on function public.review_post(uuid, boolean, text) to authenticated;
