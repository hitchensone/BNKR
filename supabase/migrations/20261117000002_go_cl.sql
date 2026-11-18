-- =====================================================================
-- GO Bunker! · GO CL — Captação de Leads
-- Fluxo: atrair → cativar → briefing → proposta → contrato → fechamento
-- Dono dos dados: lead, interações, briefing e contrato.
-- Ao assinar o contrato: cria o cliente no núcleo, gera o projeto
-- (GO UP) e emite 'contract.signed' para o GO GRAND lançar receitas.
-- =====================================================================

create type public.lead_stage as enum (
  'novo',         -- acabou de entrar na lista
  'abordado',     -- primeira mensagem enviada (atrair)
  'cativando',    -- conversa em andamento, nutrição
  'briefing',     -- levantando diretrizes, propósitos e campanhas
  'proposta',     -- proposta enviada
  'negociacao',   -- ajustes de valor e escopo
  'ganho',        -- contrato assinado, virou cliente
  'perdido'
);

create type public.contact_channel as enum (
  'whatsapp', 'instagram', 'email', 'ligacao', 'reuniao', 'presencial', 'outro'
);

-- ---------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------
create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  company_name     text not null,
  contact_name     text,
  contact_role     text,
  email            text,
  phone            text,
  instagram        text,
  website          text,
  segment          text,
  city             text,
  state            text,
  source           text,                    -- indicação, prospecção ativa, Instagram, site...
  stage            public.lead_stage not null default 'novo',
  temperature      text not null default 'morno' check (temperature in ('frio', 'morno', 'quente')),
  estimated_value  numeric(12, 2),          -- potencial mensal estimado
  next_action      text,
  next_action_at   timestamptz,
  lost_reason      text,
  notes            text,
  owner_id         uuid references auth.users (id),   -- responsável na agência
  client_id        uuid references public.clients (id) on delete set null,  -- preenchido ao virar cliente
  stage_changed_at timestamptz not null default now(),
  created_by       uuid references auth.users (id) default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index leads_stage_idx on public.leads (stage);
create index leads_owner_idx on public.leads (owner_id);
create index leads_next_action_idx on public.leads (next_action_at) where stage not in ('ganho', 'perdido');

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Registra mudança de etapa e emite evento
create or replace function public.leads_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
    perform public.emit_event(
      'lead.stage_changed', 'go_cl', 'lead', new.id, new.client_id,
      jsonb_build_object('from', old.stage, 'to', new.stage)
    );
  end if;
  return new;
end;
$$;

create trigger leads_stage_change
  before update of stage on public.leads
  for each row execute function public.leads_stage_change();

-- ---------------------------------------------------------------------
-- Modelos de mensagem (atrair e cativar)
-- Variáveis: {{contato}}, {{empresa}}, {{segmento}}, {{cidade}}, {{agencia}}
-- ---------------------------------------------------------------------
create table public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  stage       public.lead_stage not null,
  channel     public.contact_channel not null default 'whatsapp',
  subject     text,                     -- para e-mail
  body        text not null,
  active      boolean not null default true,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Interações (histórico de contato com o lead)
-- ---------------------------------------------------------------------
create table public.lead_interactions (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads (id) on delete cascade,
  channel      public.contact_channel not null,
  direction    text not null default 'saida' check (direction in ('saida', 'entrada')),
  summary      text not null,
  template_id  uuid references public.message_templates (id) on delete set null,
  occurred_at  timestamptz not null default now(),
  created_by   uuid references auth.users (id) default auth.uid(),
  created_at   timestamptz not null default now()
);

create index lead_interactions_lead_idx on public.lead_interactions (lead_id, occurred_at desc);

-- ---------------------------------------------------------------------
-- Briefing: diretrizes, propósitos, campanhas e resultados prováveis
-- ---------------------------------------------------------------------
create table public.briefings (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null references public.leads (id) on delete cascade,
  status             text not null default 'rascunho' check (status in ('rascunho', 'validado')),
  -- Diretrizes
  business_summary   text,          -- o que a empresa faz, diferencial
  target_audience    text,          -- público-alvo
  brand_guidelines   text,          -- tom de voz, identidade visual, restrições
  competitors        text,
  -- Propósitos
  purpose            text,          -- por que contratar a agência agora
  goals              jsonb not null default '[]'::jsonb,   -- [{ "objetivo": "...", "metrica": "...", "meta": "..." }]
  -- Campanhas
  campaigns          jsonb not null default '[]'::jsonb,   -- [{ "nome": "...", "canais": [...], "periodo": "...", "descricao": "..." }]
  deliverables       jsonb not null default '[]'::jsonb,   -- [{ "item": "Posts feed", "quantidade": 12, "periodicidade": "mensal" }]
  -- Resultados prováveis
  expected_results   text,
  budget_range       text,
  deadline           date,
  notes              text,
  created_by         uuid references auth.users (id) default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index briefings_lead_idx on public.briefings (lead_id);

create trigger briefings_updated_at
  before update on public.briefings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Modelos de contrato
-- Placeholders: {{numero}}, {{contratante_nome}}, {{contratante_documento}},
-- {{contratante_endereco}}, {{escopo}}, {{valor_mensal}}, {{valor_unico}},
-- {{dia_pagamento}}, {{data_inicio}}, {{duracao_meses}}, {{cidade_foro}}, {{data_hoje}}
-- ---------------------------------------------------------------------
create table public.contract_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  body        text not null,          -- Markdown com placeholders
  is_default  boolean not null default false,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index contract_templates_one_default on public.contract_templates (is_default) where is_default;

create trigger contract_templates_updated_at
  before update on public.contract_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Contratos
-- ---------------------------------------------------------------------
create sequence public.contract_number_seq;

create or replace function public.next_contract_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'GB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.contract_number_seq')::text, 4, '0');
$$;

create table public.contracts (
  id                  uuid primary key default gen_random_uuid(),
  number              text not null unique default public.next_contract_number(),
  lead_id             uuid references public.leads (id) on delete set null,
  client_id           uuid references public.clients (id) on delete set null,
  briefing_id         uuid references public.briefings (id) on delete set null,
  template_id         uuid references public.contract_templates (id) on delete set null,
  title               text not null,
  status              text not null default 'rascunho'
                      check (status in ('rascunho', 'enviado', 'assinado', 'cancelado')),
  -- Contratante (dados que vão para o contrato)
  party_name          text not null,
  party_document      text,
  party_address       text,
  party_representative text,
  -- Comercial
  billing_type        text not null default 'mensal' check (billing_type in ('mensal', 'unico', 'misto')),
  monthly_value       numeric(12, 2),
  one_time_value      numeric(12, 2),
  payment_day         smallint check (payment_day between 1 and 31),
  start_date          date,
  duration_months     smallint,
  scope               text,                  -- escopo em texto (vem do briefing)
  extra_clauses       text,
  rendered_body       text,                  -- texto final congelado ao enviar/assinar
  pdf_file_id         uuid references public.files (id) on delete set null,
  sent_at             timestamptz,
  signed_at           timestamptz,
  signed_by_name      text,
  created_by          uuid references auth.users (id) default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint contract_values check (
    (billing_type = 'mensal' and monthly_value is not null)
    or (billing_type = 'unico' and one_time_value is not null)
    or (billing_type = 'misto' and monthly_value is not null and one_time_value is not null)
  )
);

create index contracts_lead_idx on public.contracts (lead_id);
create index contracts_client_idx on public.contracts (client_id);

alter table public.projects
  add constraint projects_origin_contract_fk
  foreign key (origin_contract_id) references public.contracts (id) on delete set null;

create trigger contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Fechamento: quando o contrato vira 'assinado'
--   1. cria (ou reaproveita) o cliente no núcleo
--   2. marca o lead como ganho e liga ao cliente
--   3. gera o projeto inicial (GO UP)
--   4. emite 'contract.signed' com os valores (GO GRAND)
-- ---------------------------------------------------------------------
create or replace function public.contracts_on_sign()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead      public.leads%rowtype;
  v_client_id uuid;
  v_project_id uuid;
begin
  if new.status = 'enviado' and old.status is distinct from 'enviado' then
    new.sent_at = coalesce(new.sent_at, now());
  end if;

  if new.status <> 'assinado' or old.status = 'assinado' then
    return new;
  end if;

  new.signed_at = coalesce(new.signed_at, now());

  if new.lead_id is not null then
    select * into v_lead from public.leads where id = new.lead_id;
  end if;

  -- 1. cliente
  v_client_id := coalesce(new.client_id, v_lead.client_id);
  if v_client_id is null then
    insert into public.clients (name, trade_name, document, email, phone, instagram, website, city, state, segment, created_by)
    values (
      new.party_name,
      v_lead.company_name,
      new.party_document,
      v_lead.email, v_lead.phone, v_lead.instagram, v_lead.website,
      v_lead.city, v_lead.state, v_lead.segment,
      auth.uid()
    )
    returning id into v_client_id;
  end if;
  new.client_id := v_client_id;

  -- 2. lead ganho
  if v_lead.id is not null then
    update public.leads
       set stage = 'ganho', client_id = v_client_id
     where id = v_lead.id;
  end if;

  -- 3. projeto inicial
  insert into public.projects (client_id, name, description, status, starts_on, origin_contract_id, created_by)
  values (
    v_client_id,
    new.title,
    new.scope,
    'planejamento',
    coalesce(new.start_date, current_date),
    new.id,
    auth.uid()
  )
  returning id into v_project_id;

  -- 4. evento para o financeiro
  perform public.emit_event(
    'contract.signed', 'go_cl', 'contract', new.id, v_client_id,
    jsonb_build_object(
      'number', new.number,
      'billing_type', new.billing_type,
      'monthly_value', new.monthly_value,
      'one_time_value', new.one_time_value,
      'payment_day', new.payment_day,
      'start_date', coalesce(new.start_date, current_date),
      'duration_months', new.duration_months,
      'project_id', v_project_id
    )
  );

  return new;
end;
$$;

create trigger contracts_on_sign
  before update of status on public.contracts
  for each row execute function public.contracts_on_sign();

-- =====================================================================
-- RLS — GO CL é interno da agência.
-- O cliente só enxerga os próprios contratos (pelo GO THERE).
-- =====================================================================
alter table public.leads              enable row level security;
alter table public.message_templates  enable row level security;
alter table public.lead_interactions  enable row level security;
alter table public.briefings          enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contracts          enable row level security;

create policy "equipe gerencia leads" on public.leads
  for all using (public.is_staff()) with check (public.is_staff());

create policy "equipe gerencia modelos de mensagem" on public.message_templates
  for all using (public.is_staff()) with check (public.is_staff());

create policy "equipe gerencia interações" on public.lead_interactions
  for all using (public.is_staff()) with check (public.is_staff());

create policy "equipe gerencia briefings" on public.briefings
  for all using (public.is_staff()) with check (public.is_staff());

create policy "equipe lê modelos de contrato" on public.contract_templates
  for select using (public.is_staff());
create policy "admin gerencia modelos de contrato" on public.contract_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "ver contratos" on public.contracts
  for select using (
    public.is_staff()
    or (status in ('enviado', 'assinado') and client_id is not null and public.is_client_member(client_id))
  );
create policy "equipe cria contratos" on public.contracts
  for insert with check (public.is_staff());
create policy "equipe edita contratos" on public.contracts
  for update using (public.is_staff()) with check (public.is_staff());
create policy "admin remove contratos" on public.contracts
  for delete using (public.is_admin() and status in ('rascunho', 'cancelado'));

-- Visão do funil (usada no painel do GO CL)
create or replace view public.lead_funnel
with (security_invoker = true)
as
select
  stage,
  count(*)                          as total,
  coalesce(sum(estimated_value), 0) as estimated_value
from public.leads
group by stage;
