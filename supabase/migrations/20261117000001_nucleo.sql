-- =====================================================================
-- GO Bunker! · Núcleo compartilhado
-- Usuários e papéis, clientes, projetos, arquivos e log de eventos.
-- Todos os módulos (GO CL, GO UP, GO GRAND, GO THERE, BUNKER CHAT)
-- leem e escrevem aqui. Nenhum módulo guarda cópia destes dados.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Papéis
--   owner  → dono da agência, acesso total (inclusive GO GRAND)
--   admin  → administração, acesso total
--   team   → equipe interna, sem financeiro
--   client → usuário de um cliente, só vê o que é dele (GO THERE)
-- ---------------------------------------------------------------------
create type public.app_role as enum ('owner', 'admin', 'team', 'client');

-- Função utilitária para updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                 -- razão social ou nome
  trade_name    text,                          -- nome fantasia
  document      text,                          -- CNPJ ou CPF
  email         text,
  phone         text,
  instagram     text,
  website       text,
  city          text,
  state         text,
  segment       text,
  status        text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  notes         text,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Papéis dos usuários
-- Um usuário client fica sempre ligado a um cliente.
-- ---------------------------------------------------------------------
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  client_id  uuid references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint client_role_needs_client check (
    (role = 'client' and client_id is not null) or (role <> 'client' and client_id is null)
  ),
  unique (user_id, role, client_id)
);

create index user_roles_user_idx on public.user_roles (user_id);

-- ---------------------------------------------------------------------
-- Funções de permissão (security definer: leem user_roles sem esbarrar
-- no próprio RLS). São a base de todas as políticas do sistema.
-- ---------------------------------------------------------------------
create or replace function public.has_role(_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

-- Equipe da agência (owner, admin ou team)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('owner', 'admin', 'team')
  );
$$;

-- Administração (owner ou admin) — usado no financeiro e configurações
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- O usuário logado pertence a este cliente?
create or replace function public.is_client_member(_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'client' and client_id = _client_id
  );
$$;

-- Primeiro acesso: o primeiro usuário a chamar vira owner.
-- Depois que existe um owner, a função não faz mais nada.
create or replace function public.claim_ownership()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  perform pg_advisory_xact_lock(hashtext('claim_ownership'));
  if exists (select 1 from public.user_roles where role = 'owner') then
    return false;
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'owner');
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Projetos (o GO UP organiza demandas dentro deles;
-- o GO THERE mostra o andamento ao cliente)
-- ---------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  name          text not null,
  description   text,
  status        text not null default 'planejamento'
                check (status in ('planejamento', 'em_andamento', 'pausado', 'concluido', 'cancelado')),
  starts_on     date,
  ends_on       date,
  visible_to_client boolean not null default true,
  origin_contract_id uuid,                      -- preenchido quando nasce de um contrato do GO CL
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index projects_client_idx on public.projects (client_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Arquivos (metadados; o binário fica no Storage)
-- ---------------------------------------------------------------------
create table public.files (
  id           uuid primary key default gen_random_uuid(),
  bucket       text not null default 'arquivos',
  path         text not null,
  name         text not null,
  mime_type    text,
  size_bytes   bigint,
  client_id    uuid references public.clients (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete cascade,
  visibility   text not null default 'interno' check (visibility in ('interno', 'cliente')),
  uploaded_by  uuid references auth.users (id),
  created_at   timestamptz not null default now(),
  unique (bucket, path)
);

create index files_client_idx on public.files (client_id);
create index files_project_idx on public.files (project_id);

-- ---------------------------------------------------------------------
-- Eventos: o "barramento" entre módulos.
-- Ex.: contract.signed (GO CL) é lido pelo GO GRAND para lançar receitas.
-- ---------------------------------------------------------------------
create table public.events (
  id          bigint generated always as identity primary key,
  type        text not null,                 -- ex.: 'contract.signed', 'lead.stage_changed'
  module      text not null,                 -- 'core', 'go_cl', 'go_up', 'go_grand', 'go_there', 'chat'
  entity      text not null,
  entity_id   uuid,
  client_id   uuid references public.clients (id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  actor_id    uuid default auth.uid(),
  processed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index events_type_idx on public.events (type, created_at desc);
create index events_unprocessed_idx on public.events (created_at) where processed_at is null;

create or replace function public.emit_event(
  _type text, _module text, _entity text, _entity_id uuid,
  _client_id uuid default null, _payload jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.events (type, module, entity, entity_id, client_id, payload)
  values (_type, _module, _entity, _entity_id, _client_id, _payload);
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.clients    enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects   enable row level security;
alter table public.files      enable row level security;
alter table public.events     enable row level security;

-- Perfis: cada um vê e edita o seu; a equipe vê todos
create policy "perfil próprio" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "editar perfil próprio" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Clientes: equipe gerencia; usuário do cliente vê o próprio
create policy "equipe vê clientes" on public.clients
  for select using (public.is_staff() or public.is_client_member(id));
create policy "equipe cria clientes" on public.clients
  for insert with check (public.is_staff());
create policy "equipe edita clientes" on public.clients
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin remove clientes" on public.clients
  for delete using (public.is_admin());

-- Papéis: só a administração mexe; cada um vê os próprios
create policy "ver papéis" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "admin gerencia papéis" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- Projetos
create policy "ver projetos" on public.projects
  for select using (
    public.is_staff()
    or (visible_to_client and public.is_client_member(client_id))
  );
create policy "equipe gerencia projetos" on public.projects
  for all using (public.is_staff()) with check (public.is_staff());

-- Arquivos: cliente vê os marcados como 'cliente' e pode enviar os seus
create policy "ver arquivos" on public.files
  for select using (
    public.is_staff()
    or (visibility = 'cliente' and public.is_client_member(client_id))
  );
create policy "enviar arquivos" on public.files
  for insert with check (
    public.is_staff()
    or (public.is_client_member(client_id) and visibility = 'cliente' and uploaded_by = auth.uid())
  );
create policy "equipe edita arquivos" on public.files
  for update using (public.is_staff()) with check (public.is_staff());
create policy "equipe remove arquivos" on public.files
  for delete using (public.is_staff());

-- Eventos: só leitura para a equipe; escrita apenas via emit_event()/triggers
create policy "equipe lê eventos" on public.events
  for select using (public.is_staff());

-- =====================================================================
-- Storage: buckets privados
-- Caminho padrão: <client_id>/<project_id ou 'geral'>/<arquivo>
-- =====================================================================
-- Converte texto em uuid sem erro (retorna null se inválido)
create or replace function public.try_uuid(_value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return _value::uuid;
exception when others then
  return null;
end;
$$;

insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false), ('contratos', 'contratos', false)
on conflict (id) do nothing;

create policy "equipe acessa storage" on storage.objects
  for all using (bucket_id in ('arquivos', 'contratos') and public.is_staff())
  with check (bucket_id in ('arquivos', 'contratos') and public.is_staff());

create policy "cliente lê seus arquivos" on storage.objects
  for select using (
    bucket_id in ('arquivos', 'contratos')
    and public.is_client_member(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "cliente envia seus arquivos" on storage.objects
  for insert with check (
    bucket_id = 'arquivos'
    and public.is_client_member(public.try_uuid((storage.foldername(name))[1]))
  );
