-- =====================================================================
-- GO Bunker! · GO THERE — Portal de acompanhamento
-- Etapas do projeto, mural de atualizações e pedidos de arquivo nos
-- dois sentidos. A agência gerencia; o cliente acompanha e envia.
-- =====================================================================

-- O usuário pode ver este projeto? (equipe, ou cliente dono de projeto visível)
create or replace function public.can_see_project(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() or exists (
    select 1 from public.projects p
    where p.id = _project_id and p.visible_to_client and public.is_client_member(p.client_id)
  );
$$;

revoke execute on function public.can_see_project(uuid) from public, anon;
grant  execute on function public.can_see_project(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Etapas (linha do tempo até a entrega)
-- ---------------------------------------------------------------------
create table public.project_stages (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null,
  description   text,
  position      integer not null default 0,
  status        text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida')),
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index project_stages_project_idx on public.project_stages (project_id, position);

create trigger project_stages_updated_at
  before update on public.project_stages
  for each row execute function public.set_updated_at();

create or replace function public.project_stages_completed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    new.completed_at = now();
  elsif new.status <> 'concluida' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger project_stages_completed
  before insert or update of status on public.project_stages
  for each row execute function public.project_stages_completed();

-- ---------------------------------------------------------------------
-- Mural de atualizações
-- ---------------------------------------------------------------------
create table public.project_updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  body        text not null,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

create index project_updates_project_idx on public.project_updates (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Pedidos de arquivo
--   agencia_pede: a agência pede algo ao cliente (logo, fotos, textos)
--   cliente_pede: o cliente pede algo à agência
-- ---------------------------------------------------------------------
create table public.file_requests (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  direction    text not null check (direction in ('agencia_pede', 'cliente_pede')),
  title        text not null,
  description  text,
  status       text not null default 'aberto' check (status in ('aberto', 'respondido', 'concluido')),
  due_date     date,
  created_by   uuid references auth.users (id) default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index file_requests_project_idx on public.file_requests (project_id, created_at desc);

create trigger file_requests_updated_at
  before update on public.file_requests
  for each row execute function public.set_updated_at();

-- Arquivo pode responder a um pedido
alter table public.files add column request_id uuid references public.file_requests (id) on delete set null;
create index files_request_idx on public.files (request_id);

-- Arquivo enviado para um pedido aberto marca o pedido como respondido
create or replace function public.files_answer_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.request_id is not null then
    update public.file_requests set status = 'respondido'
     where id = new.request_id and status = 'aberto';
  end if;
  return new;
end;
$$;

create trigger files_answer_request
  after insert on public.files
  for each row execute function public.files_answer_request();

revoke execute on function public.files_answer_request() from public, anon, authenticated;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.project_stages  enable row level security;
alter table public.project_updates enable row level security;
alter table public.file_requests   enable row level security;

create policy "ver etapas" on public.project_stages
  for select using (public.can_see_project(project_id));
create policy "equipe gerencia etapas" on public.project_stages
  for all using (public.is_staff()) with check (public.is_staff());

create policy "ver atualizações" on public.project_updates
  for select using (public.can_see_project(project_id));
create policy "equipe gerencia atualizações" on public.project_updates
  for all using (public.is_staff()) with check (public.is_staff());

create policy "ver pedidos" on public.file_requests
  for select using (public.can_see_project(project_id));
create policy "equipe gerencia pedidos" on public.file_requests
  for all using (public.is_staff()) with check (public.is_staff());
create policy "cliente faz pedidos" on public.file_requests
  for insert with check (
    direction = 'cliente_pede' and status = 'aberto' and created_by = auth.uid()
    and public.can_see_project(project_id)
  );

-- Arquivos: o cliente só envia para projeto dele, como 'cliente', em seu nome,
-- e (se ligado a um pedido) apenas a pedido do mesmo projeto.
drop policy "enviar arquivos" on public.files;
create policy "enviar arquivos" on public.files
  for insert with check (
    public.is_staff()
    or (
      visibility = 'cliente'
      and uploaded_by = auth.uid()
      and public.is_client_member(client_id)
      and (project_id is null or exists (
        select 1 from public.projects p
        where p.id = project_id and p.client_id = files.client_id and p.visible_to_client
      ))
      and (request_id is null or exists (
        select 1 from public.file_requests r where r.id = request_id and r.project_id = files.project_id
      ))
    )
  );

-- Storage: o cliente só baixa arquivos registrados como visíveis a ele
-- (antes: qualquer objeto da pasta do cliente, inclusive internos).
drop policy "cliente lê seus arquivos" on storage.objects;
create policy "cliente lê seus arquivos" on storage.objects
  for select using (
    bucket_id in ('arquivos', 'contratos')
    and exists (
      select 1 from public.files f
      where f.bucket = storage.objects.bucket_id
        and f.path = storage.objects.name
        and f.visibility = 'cliente'
        and public.is_client_member(f.client_id)
    )
  );
