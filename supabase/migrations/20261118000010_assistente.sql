-- =====================================================================
-- GO Bunker! · BUNKER CHAT (parte 2) — Assistente Bunker
-- Conversa particular com o assistente (equipe) e base de conhecimento
-- que treina as respostas. A resposta é gerada no servidor.
-- =====================================================================

-- Conversa particular com o assistente: tipo "direto" com uma pessoa só
alter table public.chat_channels add column is_assistant boolean not null default false;

create or replace function public.open_assistant_chat()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := 'bot:' || auth.uid()::text;
  v_id  uuid;
begin
  if not public.is_staff() then
    raise exception 'O assistente particular é da equipe.';
  end if;
  select id into v_id from public.chat_channels where direct_key = v_key;
  if v_id is null then
    insert into public.chat_channels (kind, direct_key, is_assistant) values ('direto', v_key, true)
    on conflict (direct_key) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.chat_channels where direct_key = v_key;
    end if;
    insert into public.chat_members (channel_id, user_id) values (v_id, auth.uid()) on conflict do nothing;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.open_assistant_chat() from public, anon;
grant  execute on function public.open_assistant_chat() to authenticated;

-- ---------------------------------------------------------------------
-- Base de conhecimento
--   equipe → só nas conversas internas
--   todos  → também nas conversas com clientes
-- ---------------------------------------------------------------------
create table public.assistant_knowledge (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 120),
  content    text not null check (char_length(content) between 1 and 8000),
  audience   text not null default 'equipe' check (audience in ('equipe', 'todos')),
  active     boolean not null default true,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assistant_knowledge_updated_at
  before update on public.assistant_knowledge
  for each row execute function public.set_updated_at();

alter table public.assistant_knowledge enable row level security;

create policy "admin gerencia o conhecimento" on public.assistant_knowledge
  for all using (public.is_admin()) with check (public.is_admin());
create policy "equipe lê o conhecimento" on public.assistant_knowledge
  for select using (public.is_staff());
create policy "cliente lê o conhecimento público" on public.assistant_knowledge
  for select using (audience = 'todos' and active and exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = 'client'
  ));

-- Ponto de partida (edite em Bunker Chat › Treinar assistente)
insert into public.assistant_knowledge (title, content, audience, created_by) values
('Sobre a GO Bunker!',
 'A GO Bunker! Mídia e Tecnologia é a agência de Glauber Hitchens, em Aparecida de Goiânia (GO). Trabalha com direção de arte, design, identidade visual, motion, vídeo, gestão de redes sociais e tecnologia.',
 'todos', null),
('Como funciona a aprovação de posts',
 'Os posts que precisam de aprovação aparecem no GO THERE, em "Posts para você aprovar". O cliente pode aprovar com um clique ou pedir ajuste dizendo o que mudar. Depois de aprovado, a agência agenda e publica. Os resultados de cada post aparecem em "Resultados das publicações".',
 'todos', null),
('Como trocar arquivos',
 'No GO THERE de cada projeto, em Arquivos, o cliente envia e baixa arquivos. Quando a agência precisa de algo (logo, fotos, textos), cria um pedido de arquivo e o cliente responde enviando direto no pedido.',
 'todos', null);
