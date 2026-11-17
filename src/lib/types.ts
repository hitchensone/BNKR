// Tipos de domínio espelhando as tabelas do Supabase.
// Quando o projeto Supabase existir, dá pra gerar tudo automaticamente com
// `npm run db:types` e trocar estes tipos pelos gerados.

export type AppRole = "owner" | "admin" | "team" | "client";

export type LeadStage =
  | "novo"
  | "abordado"
  | "cativando"
  | "briefing"
  | "proposta"
  | "negociacao"
  | "ganho"
  | "perdido";

export type ContactChannel =
  | "whatsapp"
  | "instagram"
  | "email"
  | "ligacao"
  | "reuniao"
  | "presencial"
  | "outro";

export interface Client {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  segment: string | null;
  status: "ativo" | "pausado" | "encerrado";
  notes: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_role: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  segment: string | null;
  city: string | null;
  state: string | null;
  source: string | null;
  stage: LeadStage;
  temperature: "frio" | "morno" | "quente";
  estimated_value: number | null;
  next_action: string | null;
  next_action_at: string | null;
  lost_reason: string | null;
  notes: string | null;
  owner_id: string | null;
  client_id: string | null;
  stage_changed_at: string;
  created_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  channel: ContactChannel;
  direction: "saida" | "entrada";
  summary: string;
  template_id: string | null;
  occurred_at: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  stage: LeadStage;
  channel: ContactChannel;
  subject: string | null;
  body: string;
  active: boolean;
}

export interface BriefingGoal {
  objetivo: string;
  metrica?: string;
  meta?: string;
}

export interface BriefingCampaign {
  nome: string;
  canais?: string[];
  periodo?: string;
  descricao?: string;
}

export interface BriefingDeliverable {
  item: string;
  quantidade?: number;
  periodicidade?: string;
}

export interface Briefing {
  id: string;
  lead_id: string;
  status: "rascunho" | "validado";
  business_summary: string | null;
  target_audience: string | null;
  brand_guidelines: string | null;
  competitors: string | null;
  purpose: string | null;
  goals: BriefingGoal[];
  campaigns: BriefingCampaign[];
  deliverables: BriefingDeliverable[];
  expected_results: string | null;
  budget_range: string | null;
  deadline: string | null;
  notes: string | null;
}

export type ContractStatus = "rascunho" | "enviado" | "assinado" | "cancelado";
export type BillingType = "mensal" | "unico" | "misto";

export interface Contract {
  id: string;
  number: string;
  lead_id: string | null;
  client_id: string | null;
  briefing_id: string | null;
  template_id: string | null;
  title: string;
  status: ContractStatus;
  party_name: string;
  party_document: string | null;
  party_address: string | null;
  party_representative: string | null;
  billing_type: BillingType;
  monthly_value: number | null;
  one_time_value: number | null;
  payment_day: number | null;
  start_date: string | null;
  duration_months: number | null;
  scope: string | null;
  extra_clauses: string | null;
  rendered_body: string | null;
  sent_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  created_at: string;
}

export interface ContractTemplate {
  id: string;
  name: string;
  body: string;
  is_default: boolean;
}
