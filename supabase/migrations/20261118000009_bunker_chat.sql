-- =====================================================================
-- GO Bunker! · BUNKER CHAT (parte 1)
-- Três tipos de conversa:
--   canal    → interno, toda a equipe vê (ex.: #geral)
--   direto   → interno, só as duas pessoas da conversa
--   projeto  → uma por projeto: equipe + cliente daquele projeto
-- As mensagens chegam em tempo real (Supabase Realtime respeita o RLS).
-- =====================================================================

create table public.chat_channels (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('canal', 'direto', 'projeto')),
  name            text,
  description     text,
  project_id      uuid unique references public.projects (id) on delete cascade,
  direct_key      text unique,                    -- "menorUUID:maiorUUID" nas conversas diretas
  archived        boolean not null default false,
  last_message_at timestamptz,
  created_by      uuid references auth.users (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  constraint chat_kind_shape check (
    (kind = 'canal'   and name is not null and project_id is null and direct_key is null) or
    (kind = 'direto'  and direct_key is not null and project_id is null) or
    (kind = 'projeto' and project_id is not null and direct_key is null)
  )
);

-- Participantes das conversas diretas
create table public.chat_members (
  channel_id uuid not null references public.chat_channels (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  primary key (channel_id, user_id)
);

create index chat_members_user_idx on public.chat_members (user_id);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.chat_channels (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null default auth.uid(),
  author_name text,                               -- copiado do perfil: o cliente não lê perfis da equipe
  kind        text not null default 'usuario' check (kind in ('usuario', 'assistente', 'sistema')),
  body        text not null check (char_length(body) between 1 and 4000),
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index chat_messages_channel_idx on public.chat_messages (channel_id, created_at desc);

-- Até onde cada pessoa leu
create table public.chat_reads (
  channel_id   uuid not null references public.chat_channels (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- ---------------------------------------------------------------------
-- Quem acessa cada conversa
-- ---------------------------------------------------------------------
create or replace function public.can_access_channel(_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chat_channels c
     where c.id = _channel_id
       and case c.kind
             when 'canal'   then public.is_staff()
             when 'direto'  then public.is_staff() and exists (
                                   select 1 from public.chat_members m
                                    where m.channel_id = c.id and m.user_id = auth.uid())
             when 'projeto' then public.can_see_project(c.project_id)
           end
  );
$$;

-- ---------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------

-- Mensagem nova: grava o nome do autor e atualiza a conversa
create or replace function public.chat_message_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'usuario' then
    new.author_id = auth.uid();
    select coalesce(nullif(trim(full_name), ''), 'Usuário') into new.author_name
      from public.profiles where id = new.author_id;
  end if;
  new.body = trim(new.body);
  return new;
end;
$$;

create trigger chat_message_before
  before insert on public.chat_messages
  for each row execute function public.chat_message_before();

create or replace function public.chat_message_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_channels set last_message_at = new.created_at where id = new.channel_id;
  if new.author_id is not null then
    insert into public.chat_reads (channel_id, user_id, last_read_at)
    values (new.channel_id, new.author_id, new.created_at)
    on conflict (channel_id, user_id) do update set last_read_at = excluded.last_read_at;
  end if;
  return null;
end;
$$;

create trigger chat_message_after
  after insert on public.chat_messages
  for each row execute function public.chat_message_after();

-- Todo projeto ganha sua conversa com o cliente
create or replace function public.projects_chat_channel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.chat_channels (kind, project_id, created_by)
  values ('projeto', new.id, new.created_by)
  on conflict (project_id) do nothing;
  return null;
end;
$$;

create trigger projects_chat_channel
  after insert on public.projects
  for each row execute function public.projects_chat_channel();

insert into public.chat_channels (kind, project_id, created_by)
select 'projeto', p.id, p.created_by from public.projects p
on conflict (project_id) do nothing;

insert into public.chat_channels (kind, name, description, created_by)
values ('canal', 'geral', 'Conversa da equipe toda', null);

-- ---------------------------------------------------------------------
-- Ações (RPC)
-- ---------------------------------------------------------------------

-- Abre (ou reaproveita) a conversa direta com outra pessoa da equipe
create or replace function public.open_direct_chat(_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_id  uuid;
begin
  if not public.is_staff() then
    raise exception 'Só a equipe usa conversas diretas.';
  end if;
  if _other is null or _other = auth.uid() then
    raise exception 'Escolha outra pessoa.';
  end if;
  if not exists (select 1 from public.user_roles where user_id = _other and role in ('owner', 'admin', 'team')) then
    raise exception 'Essa pessoa não é da equipe.';
  end if;

  v_key = least(auth.uid()::text, _other::text) || ':' || greatest(auth.uid()::text, _other::text);
  select id into v_id from public.chat_channels where direct_key = v_key;
  if v_id is null then
    insert into public.chat_channels (kind, direct_key) values ('direto', v_key)
    on conflict (direct_key) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.chat_channels where direct_key = v_key;
    end if;
    insert into public.chat_members (channel_id, user_id)
    values (v_id, auth.uid()), (v_id, _other)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;

-- Marca a conversa como lida
create or replace function public.mark_chat_read(_channel_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_access_channel(_channel_id) then
    raise exception 'Conversa não encontrada.';
  end if;
  insert into public.chat_reads (channel_id, user_id, last_read_at)
  values (_channel_id, auth.uid(), now())
  on conflict (channel_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;

-- Lista de conversas de quem está logado, com não lidas e última mensagem.
-- Roda com as permissões de quem chama (RLS vale normalmente).
create or replace function public.my_chats()
returns table (
  id uuid, kind text, name text, description text, project_id uuid, archived boolean,
  last_message_at timestamptz, unread integer, last_body text, last_author text, other_user uuid
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.kind, c.name, c.description, c.project_id, c.archived, c.last_message_at,
         (select count(*)::int from public.chat_messages m
           where m.channel_id = c.id and m.deleted_at is null
             and (m.author_id is distinct from auth.uid())
             and m.created_at > coalesce(r.last_read_at, '-infinity')) as unread,
         lm.body, lm.author_name,
         (select mb.user_id from public.chat_members mb
           where mb.channel_id = c.id and mb.user_id <> auth.uid() limit 1) as other_user
    from public.chat_channels c
    left join public.chat_reads r on r.channel_id = c.id and r.user_id = auth.uid()
    left join lateral (
      select m.body, m.author_name from public.chat_messages m
       where m.channel_id = c.id and m.deleted_at is null
       order by m.created_at desc limit 1
    ) lm on true
   order by c.last_message_at desc nulls last, c.created_at;
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.chat_channels enable row level security;
alter table public.chat_members  enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reads    enable row level security;

create policy "vê conversas que acessa" on public.chat_channels
  for select using (public.can_access_channel(id));
create policy "equipe cria canais" on public.chat_channels
  for insert with check (public.is_staff() and kind = 'canal');
create policy "admin edita canais" on public.chat_channels
  for update using (public.is_admin() and kind = 'canal') with check (public.is_admin() and kind = 'canal');

create policy "vê participantes das suas conversas" on public.chat_members
  for select using (public.can_access_channel(channel_id));

create policy "lê mensagens das suas conversas" on public.chat_messages
  for select using (public.can_access_channel(channel_id));
create policy "escreve nas suas conversas" on public.chat_messages
  for insert with check (kind = 'usuario' and public.can_access_channel(channel_id));
-- Editar e apagar: só o autor, só o texto (colunas liberadas abaixo)
create policy "autor edita a própria mensagem" on public.chat_messages
  for update using (author_id = auth.uid() and kind = 'usuario')
  with check (author_id = auth.uid() and public.can_access_channel(channel_id));

create policy "vê as próprias leituras" on public.chat_reads
  for select using (user_id = auth.uid());

revoke update on public.chat_messages from authenticated, anon;
grant  update (body, edited_at, deleted_at) on public.chat_messages to authenticated;

revoke execute on function public.chat_message_before() from public, anon, authenticated;
revoke execute on function public.chat_message_after() from public, anon, authenticated;
revoke execute on function public.projects_chat_channel() from public, anon, authenticated;
revoke execute on function public.can_access_channel(uuid) from public, anon;
revoke execute on function public.open_direct_chat(uuid) from public, anon;
revoke execute on function public.mark_chat_read(uuid) from public, anon;
revoke execute on function public.my_chats() from public, anon;
grant  execute on function public.can_access_channel(uuid) to authenticated;
grant  execute on function public.open_direct_chat(uuid) to authenticated;
grant  execute on function public.mark_chat_read(uuid) to authenticated;
grant  execute on function public.my_chats() to authenticated;

-- Tempo real
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;
