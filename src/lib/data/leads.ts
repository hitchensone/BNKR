import { createClient } from "@/lib/supabase/server";
import type { Lead, LeadInteraction, LeadStage, MessageTemplate } from "@/lib/types";

// Camada de acesso a dados do GO CL. As telas chamam estas funções,
// nunca o Supabase direto, para que trocar o backend mexa só aqui.

export async function listLeads() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("next_action_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

export async function getLead(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Lead;
}

export type LeadInput = Partial<Omit<Lead, "id" | "created_at" | "stage_changed_at" | "client_id">> & {
  company_name: string;
};

export async function createLead(input: LeadInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").insert(input).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function updateLead(id: string, input: Partial<LeadInput>) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function moveLead(id: string, stage: LeadStage, lostReason?: string) {
  return updateLead(id, { stage, lost_reason: stage === "perdido" ? lostReason ?? null : null });
}

export async function listInteractions(leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_interactions")
    .select("*")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data as LeadInteraction[];
}

export async function logInteraction(input: Omit<LeadInteraction, "id" | "occurred_at"> & { occurred_at?: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("lead_interactions").insert(input);
  if (error) throw error;
}

export async function listMessageTemplates(stage?: LeadStage) {
  const supabase = await createClient();
  let query = supabase.from("message_templates").select("*").eq("active", true).order("name");
  if (stage) query = query.eq("stage", stage);
  const { data, error } = await query;
  if (error) throw error;
  return data as MessageTemplate[];
}
