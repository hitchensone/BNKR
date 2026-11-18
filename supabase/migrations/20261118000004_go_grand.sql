-- =====================================================================
-- GO Bunker! · GO GRAND — Financeiro
-- Lançamentos (entradas e saídas) e recorrências (contratos mensais,
-- plataformas, IAs). Contrato assinado no GO CL vira receita sozinho.
-- Acesso: só owner e admin.
-- =====================================================================

-- Categorias. Aporte e retirada movimentam o caixa, mas não contam
-- como receita/despesa operacional nos indicadores.
create or replace function public.grand_category_kind(_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when _category in ('contrato_mensal', 'contrato_unico', 'venda_tecnologia', 'servico_avulso', 'aporte', 'outra_entrada') then 'entrada'
    when _category in ('plataformas', 'ia', 'compra_tecnologia', 'equipamentos', 'terceiros', 'marketing', 'impostos', 'retirada', 'outra_saida') then 'saida'
  end;
$$;

-- ---------------------------------------------------------------------
-- Recorrências
-- ---------------------------------------------------------------------
create table public.recurring_items (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('entrada', 'saida')),
  category      text not null,
  description   text not null,
  amount        numeric(12, 2) not null check (amount > 0),
  day_of_month  smallint not null default 10 check (day_of_month between 1 and 31),
  start_date    date not null default current_date,
  end_date      date,
  client_id     uuid references public.clients (id) on delete set null,
  contract_id   uuid references public.contracts (id) on delete set null,
  active        boolean not null default true,
  notes         text,
  created_by    uuid references auth.users (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint recurring_category_kind check (public.grand_category_kind(category) = kind),
  constraint recurring_dates check (end_date is null or end_date >= start_date)
);

create index recurring_items_active_idx on public.recurring_items (active);

create trigger recurring_items_updated_at
  before update on public.recurring_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Lançamentos
-- ---------------------------------------------------------------------
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('entrada', 'saida')),
  category        text not null,
  description     text not null,
  amount          numeric(12, 2) not null check (amount > 0),
  due_date        date not null,              -- vencimento / data prevista
  paid_at         date,                       -- preenchido quando pago/recebido
  payment_method  text,
  client_id       uuid references public.clients (id) on delete set null,
  contract_id     uuid references public.contracts (id) on delete set null,
  project_id      uuid references public.projects (id) on delete set null,
  recurring_id    uuid references public.recurring_items (id) on delete set null,
  notes           text,
  created_by      uuid references auth.users (id) default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint transaction_category_kind check (public.grand_category_kind(category) = kind)
);

-- Uma parcela por recorrência e vencimento (geração idempotente).
create unique index transactions_recurring_due_uniq on public.transactions (recurring_id, due_date) where recurring_id is not null;
create index transactions_due_idx on public.transactions (due_date);
create index transactions_paid_idx on public.transactions (paid_at);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Geração das parcelas das recorrências até uma data.
-- O vencimento usa o dia escolhido, limitado ao último dia do mês.
-- ---------------------------------------------------------------------
create or replace function public.grand_generate_for(_recurring_id uuid, _until date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.recurring_items%rowtype;
  v_count integer := 0;
  v_month date;
  v_due date;
  v_last date;
begin
  select * into r from public.recurring_items where id = _recurring_id and active;
  if not found then
    return 0;
  end if;

  v_last := least(coalesce(r.end_date, _until), _until);

  for v_month in
    select generate_series(date_trunc('month', r.start_date), date_trunc('month', v_last), interval '1 month')::date
  loop
    v_due := v_month + (least(
      r.day_of_month,
      extract(day from (v_month + interval '1 month' - interval '1 day'))::int
    ) - 1);

    continue when v_due < r.start_date or v_due > v_last;

    insert into public.transactions (kind, category, description, amount, due_date, client_id, contract_id, recurring_id, created_by)
    values (r.kind, r.category, r.description, r.amount, v_due, r.client_id, r.contract_id, r.id, r.created_by)
    on conflict (recurring_id, due_date) where recurring_id is not null do nothing;

    if found then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- Chamada pelo painel: gera tudo até o fim do mês seguinte (previsão).
create or replace function public.grand_generate(_until date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until date := coalesce(_until, (date_trunc('month', current_date) + interval '2 months' - interval '1 day')::date);
  v_total integer := 0;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito à administração.';
  end if;
  for v_id in select id from public.recurring_items where active loop
    v_total := v_total + public.grand_generate_for(v_id, v_until);
  end loop;
  return v_total;
end;
$$;

-- ---------------------------------------------------------------------
-- Contrato assinado (evento do GO CL) → receitas
-- ---------------------------------------------------------------------
create or replace function public.grand_on_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb := new.payload;
  v_start date;
  v_months int;
  v_rec uuid;
  v_label text;
begin
  if new.type <> 'contract.signed' then
    return new;
  end if;

  v_start := coalesce((p ->> 'start_date')::date, current_date);
  v_months := nullif(p ->> 'duration_months', '')::int;
  v_label := 'Contrato ' || coalesce(p ->> 'number', '');

  if (p ->> 'monthly_value') is not null then
    insert into public.recurring_items (kind, category, description, amount, day_of_month, start_date, end_date, client_id, contract_id, created_by)
    values (
      'entrada', 'contrato_mensal', v_label,
      (p ->> 'monthly_value')::numeric,
      coalesce(nullif(p ->> 'payment_day', '')::int, 10),
      v_start,
      case when v_months is not null then (v_start + make_interval(months => v_months) - interval '1 day')::date end,
      new.client_id, new.entity_id, new.actor_id
    )
    returning id into v_rec;

    perform public.grand_generate_for(
      v_rec,
      (date_trunc('month', greatest(current_date, v_start)) + interval '2 months' - interval '1 day')::date
    );
  end if;

  if (p ->> 'one_time_value') is not null then
    insert into public.transactions (kind, category, description, amount, due_date, client_id, contract_id, project_id, created_by)
    values (
      'entrada', 'contrato_unico', v_label || ' · valor único',
      (p ->> 'one_time_value')::numeric,
      v_start, new.client_id, new.entity_id,
      nullif(p ->> 'project_id', '')::uuid, new.actor_id
    );
  end if;

  update public.events set processed_at = now() where id = new.id;
  return new;
end;
$$;

create trigger events_grand
  after insert on public.events
  for each row
  when (new.type = 'contract.signed')
  execute function public.grand_on_event();

-- =====================================================================
-- RLS e permissões
-- =====================================================================
alter table public.recurring_items enable row level security;
alter table public.transactions    enable row level security;

create policy "admin gerencia recorrências" on public.recurring_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admin gerencia lançamentos" on public.transactions
  for all using (public.is_admin()) with check (public.is_admin());

revoke execute on function public.grand_generate_for(uuid, date) from public, anon, authenticated;
revoke execute on function public.grand_on_event()                from public, anon, authenticated;
revoke execute on function public.grand_generate(date)           from public, anon;
grant  execute on function public.grand_generate(date)           to authenticated;
