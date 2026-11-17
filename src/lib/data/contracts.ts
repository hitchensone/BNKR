import { createClient } from "@/lib/supabase/server";
import type { Briefing, Contract, ContractStatus, ContractTemplate } from "@/lib/types";
import { renderContract, type AgencyInfo } from "@/lib/go-cl/render";

export const agencyInfo: AgencyInfo = {
  documento: process.env.AGENCIA_DOCUMENTO,
  endereco: process.env.AGENCIA_ENDERECO,
  cidadeForo: process.env.AGENCIA_CIDADE_FORO,
};

export async function getBriefingByLead(leadId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Briefing | null;
}

export async function saveBriefing(input: Partial<Briefing> & { lead_id: string }) {
  const supabase = await createClient();
  const { data, error } = input.id
    ? await supabase.from("briefings").update(input).eq("id", input.id).select().single()
    : await supabase.from("briefings").insert(input).select().single();
  if (error) throw error;
  return data as Briefing;
}

export async function listContracts() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Contract[];
}

export async function getContract(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Contract;
}

export async function getDefaultContractTemplate() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contract_templates").select("*").eq("is_default", true).maybeSingle();
  if (error) throw error;
  return data as ContractTemplate | null;
}

export type ContractInput = Omit<
  Contract,
  "id" | "number" | "status" | "rendered_body" | "sent_at" | "signed_at" | "signed_by_name" | "created_at" | "client_id"
>;

export async function createContract(input: ContractInput) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contracts").insert(input).select().single();
  if (error) throw error;
  return data as Contract;
}

/** Texto final do contrato (Markdown) a partir do modelo. */
export async function previewContract(contract: Contract) {
  if (contract.rendered_body) return contract.rendered_body;
  const supabase = await createClient();
  const { data: template } = contract.template_id
    ? await supabase.from("contract_templates").select("*").eq("id", contract.template_id).single()
    : { data: await getDefaultContractTemplate() };
  if (!template) throw new Error("Nenhum modelo de contrato encontrado.");
  return renderContract((template as ContractTemplate).body, contract, agencyInfo);
}

/**
 * Muda o status. Ao enviar, o texto é congelado em rendered_body.
 * Ao assinar, o banco cria cliente, projeto e o evento para o financeiro.
 */
export async function setContractStatus(id: string, status: ContractStatus, signedByName?: string) {
  const supabase = await createClient();
  const contract = await getContract(id);
  const patch: Partial<Contract> = { status };
  if (status === "enviado" || status === "assinado") {
    patch.rendered_body = await previewContract(contract);
  }
  if (status === "assinado") patch.signed_by_name = signedByName ?? contract.party_representative ?? contract.party_name;
  const { data, error } = await supabase.from("contracts").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Contract;
}
