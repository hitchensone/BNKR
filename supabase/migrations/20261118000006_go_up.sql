-- =====================================================================
-- GO Bunker! · GO UP — Work OS (parte 1: demandas e fluxo)
-- Colunas de fluxo configuráveis, demandas com subtarefas, comentários,
-- modelos de projeto e atualização automática das etapas do GO THERE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Colunas do fluxo (valem para todos os projetos da agência)
-- ---------------------------------------------------------------------
create table public.task_columns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  position    integer not null default 0,
  is_done     boolean not null default false,   -- demanda nesta coluna conta como concluída
  tint        text not null default 'blue' check (tint in ('red', 'yellow', 'green', 'blue', 'purple', 'orange')),
  created_at  timestamptz not null default now()
);

insert into public.task_columns (name, position, is_done, tint) values
  ('A fazer', 0, false, 'blue'),
  ('Em produção', 1, false, 'orange'),
  ('Revisão interna', 2, false, 'purple'),
  ('Aprovação do cliente', 3, false, 'yellow'),
  ('Concluído', 4, true, 'green');

-- ---------------------------------------------------------------------
-- Demandas
-- ---------------------------------------------------------------------
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  column_id         uuid not null references public.task_columns (id),
  parent_id         uuid references public.tasks (id) on delete cascade,   -- subtarefa
  stage_id          uuid references public.project_stages (id) on delete set null,
  title             text not null,
  description       text,
  priority          text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  assignee_id       uuid references auth.users (id) on delete set null,  -- quem entrega
  requested_by      uuid references auth.users (id) on delete set null,  -- quem pediu
  due_date          date,
  position          double precision not null default 0,
  visible_to_client boolean not null default false,
  completed_at      timestamptz,
  created_by        uuid references auth.users (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint task_not_own_parent check (parent_id is null or parent_id <> id)
);

create index tasks_project_idx on public.tasks (project_id, column_id, position);
create index tasks_assignee_idx on public.tasks (assignee_id) where completed_at is null;
create index tasks_parent_idx on public.tasks (parent_id);
create index tasks_stage_idx on public.tasks (stage_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- Concluída = está numa coluna "is_done"
create or replace function public.tasks_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_done boolean;
begin
  select is_done into v_done from public.task_columns where id = new.column_id;
  if v_done and (tg_op = 'INSERT' or new.completed_at is null) then
    new.completed_at = now();
  elsif not v_done then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completion
  before insert or update of column_id on public.tasks
  for each row execute function public.tasks_completion();

-- Etapa acompanha suas demandas (só demandas principais, sem subtarefas):
--   todas concluídas → concluída; alguma fora da 1ª coluna → em andamento;
--   todas na 1ª coluna → pendente. Etapa sem demandas não muda.
create or replace function public.refresh_stage(_stage_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total int;
  v_done int;
  v_started int;
  v_first int;
  v_status text;
begin
  if _stage_id is null then
    return;
  end if;
  select min(position) into v_first from public.task_columns;
  select count(*),
         count(*) filter (where t.completed_at is not null),
         count(*) filter (where c.position > v_first)
    into v_total, v_done, v_started
    from public.tasks t join public.task_columns c on c.id = t.column_id
   where t.stage_id = _stage_id and t.parent_id is null;

  if v_total = 0 then
    return;
  end if;
  v_status := case when v_done = v_total then 'concluida' when v_started > 0 then 'em_andamento' else 'pendente' end;
  update public.project_stages set status = v_status where id = _stage_id and status is distinct from v_status;
end;
$$;

create or replace function public.tasks_refresh_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_stage(old.stage_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id or new.column_id is distinct from old.column_id) then
    perform public.refresh_stage(new.stage_id);
  end if;
  return null;
end;
$$;

create trigger tasks_refresh_stage
  after insert or update of column_id, stage_id or delete on public.tasks
  for each row execute function public.tasks_refresh_stage();

-- ---------------------------------------------------------------------
-- Comentários (internos da equipe)
-- ---------------------------------------------------------------------
create table public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks (id) on delete cascade,
  body        text not null,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

create index task_comments_task_idx on public.task_comments (task_id, created_at);

-- ---------------------------------------------------------------------
-- Modelos de projeto: etapas + demandas com prazos relativos ao início
-- ---------------------------------------------------------------------
create table public.project_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table public.template_items (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.project_templates (id) on delete cascade,
  kind         text not null check (kind in ('etapa', 'tarefa')),
  title        text not null,
  stage_title  text,               -- tarefa: a qual etapa do modelo pertence
  offset_days  integer not null default 0,
  priority     text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  position     integer not null default 0
);

create index template_items_template_idx on public.template_items (template_id, position);

-- Aplica um modelo a um projeto. Retorna quantas demandas criou.
create or replace function public.apply_template(_project_id uuid, _template_id uuid, _start date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first uuid;
  v_pos int;
  v_count int := 0;
  it record;
  v_stage uuid;
begin
  if not public.is_staff() then
    raise exception 'Acesso restrito à equipe.';
  end if;
  select id into v_first from public.task_columns order by position limit 1;
  select coalesce(max(position), -1) into v_pos from public.project_stages where project_id = _project_id;

  create temporary table if not exists pg_temp._tpl_stages (title text primary key, id uuid) on commit drop;
  truncate pg_temp._tpl_stages;

  for it in select * from public.template_items where template_id = _template_id and kind = 'etapa' order by position loop
    v_pos := v_pos + 1;
    insert into public.project_stages (project_id, title, position, due_date)
    values (_project_id, it.title, v_pos, _start + it.offset_days)
    returning id into v_stage;
    insert into pg_temp._tpl_stages values (it.title, v_stage) on conflict do nothing;
  end loop;

  for it in select * from public.template_items where template_id = _template_id and kind = 'tarefa' order by position loop
    insert into public.tasks (project_id, column_id, stage_id, title, priority, due_date, position, requested_by)
    values (
      _project_id, v_first,
      (select id from pg_temp._tpl_stages where title = it.stage_title),
      it.title, it.priority, _start + it.offset_days, it.position, auth.uid()
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Modelo inicial
with t as (
  insert into public.project_templates (name, description)
  values ('Gestão de redes sociais (mês)', 'Planejamento, criação, aprovação e publicação de um mês de conteúdo.')
  returning id
)
insert into public.template_items (template_id, kind, title, stage_title, offset_days, priority, position)
select t.id, i.kind, i.title, i.stage_title, i.offset_days, i.priority, i.position from t, (values
  ('etapa',  'Planejamento',          null,                    5, 'normal', 0),
  ('etapa',  'Criação',               null,                   15, 'normal', 1),
  ('etapa',  'Aprovação do cliente',  null,                   20, 'normal', 2),
  ('etapa',  'Publicação',            null,                   30, 'normal', 3),
  ('tarefa', 'Reunião de pauta com o cliente', 'Planejamento',  2, 'alta',   0),
  ('tarefa', 'Calendário editorial do mês',    'Planejamento',  5, 'alta',   1),
  ('tarefa', 'Roteiros e legendas',            'Criação',      10, 'normal', 2),
  ('tarefa', 'Artes do feed e carrosséis',     'Criação',      14, 'normal', 3),
  ('tarefa', 'Edição de reels',                'Criação',      15, 'normal', 4),
  ('tarefa', 'Enviar para aprovação',          'Aprovação do cliente', 17, 'alta', 5),
  ('tarefa', 'Ajustes pedidos pelo cliente',   'Aprovação do cliente', 20, 'normal', 6),
  ('tarefa', 'Agendar publicações',            'Publicação',   22, 'normal', 7),
  ('tarefa', 'Relatório de resultados',        'Publicação',   30, 'normal', 8)
) as i(kind, title, stage_title, offset_days, priority, position);

-- =====================================================================
-- RLS e permissões
-- =====================================================================
alter table public.task_columns      enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_comments     enable row level security;
alter table public.project_templates enable row level security;
alter table public.template_items    enable row level security;

create policy "todos leem colunas" on public.task_columns
  for select to authenticated using (true);
create policy "admin gerencia colunas" on public.task_columns
  for all using (public.is_admin()) with check (public.is_admin());

create policy "equipe gerencia demandas" on public.tasks
  for all using (public.is_staff()) with check (public.is_staff());
create policy "cliente vê demandas liberadas" on public.tasks
  for select using (visible_to_client and public.can_see_project(project_id));

create policy "equipe gerencia comentários" on public.task_comments
  for all using (public.is_staff()) with check (public.is_staff());

create policy "equipe lê modelos" on public.project_templates
  for select using (public.is_staff());
create policy "admin gerencia modelos" on public.project_templates
  for all using (public.is_admin()) with check (public.is_admin());
create policy "equipe lê itens de modelo" on public.template_items
  for select using (public.is_staff());
create policy "admin gerencia itens de modelo" on public.template_items
  for all using (public.is_admin()) with check (public.is_admin());

revoke execute on function public.tasks_completion()      from public, anon, authenticated;
revoke execute on function public.tasks_refresh_stage()   from public, anon, authenticated;
revoke execute on function public.refresh_stage(uuid)     from public, anon, authenticated;
revoke execute on function public.apply_template(uuid, uuid, date) from public, anon;
grant  execute on function public.apply_template(uuid, uuid, date) to authenticated;
