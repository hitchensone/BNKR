"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/data/session";
import { createContract, getContract, setContractStatus, updateContract } from "@/lib/data/contracts";
import { getLead, moveLead } from "@/lib/data/leads";

const text = z.string().trim().transform((v) => v || null);
const money = z
  .string()
  .trim()
  .transform((v) => (v ? Number(v.replace(/[R$\s.]/g, "").replace(",", ".")) : null))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Valor inválido.");
const int = (min: number, max: number, msg: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= min && v <= max), msg);

const ContractSchema = z
  .object({
    id: z.string().optional(),
    lead_id: z.uuid().optional(),
    briefing_id: z.string().optional(),
    title: z.string().trim().min(1, "Dê um título ao contrato."),
    party_name: z.string().trim().min(1, "Informe a razão social ou nome do contratante."),
    party_document: text,
    party_address: text,
    party_representative: text,
    billing_type: z.enum(["mensal", "unico", "misto"]),
    monthly_value: money,
    one_time_value: money,
    payment_day: int(1, 31, "Dia de pagamento entre 1 e 31."),
    start_date: z.string().transform((v) => v || null),
    duration_months: int(1, 120, "Duração em meses entre 1 e 120."),
    scope: z.string().trim().min(1, "O escopo não pode ficar vazio."),
    extra_clauses: text,
  })
  .superRefine((c, ctx) => {
    if (c.billing_type !== "unico" && c.monthly_value == null)
      ctx.addIssue({ code: "custom", message: "Informe o valor mensal." });
    if (c.billing_type !== "mensal" && c.one_time_value == null)
      ctx.addIssue({ code: "custom", message: "Informe o valor único." });
  });

export type ContractFormState = { error?: string } | null;

export async function saveContractAction(_: ContractFormState, formData: FormData): Promise<ContractFormState> {
  await requireStaff();
  const parsed = ContractSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, lead_id, briefing_id, ...data } = parsed.data;
  // Valores que não se aplicam ao tipo de cobrança ficam vazios.
  if (data.billing_type === "mensal") data.one_time_value = null;
  if (data.billing_type === "unico") data.monthly_value = null;

  let contractId = id;
  try {
    if (id) {
      await updateContract(id, data);
    } else {
      const created = await createContract({
        ...data,
        lead_id: lead_id ?? null,
        briefing_id: briefing_id || null,
        template_id: null,
        pdf_file_id: null,
      } as Parameters<typeof createContract>[0]);
      contractId = created.id;
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar o contrato." };
  }

  revalidatePath("/go-cl/contratos");
  if (lead_id) revalidatePath(`/go-cl/${lead_id}`);
  redirect(`/go-cl/contratos/${contractId}`);
}

const EARLY_STAGES = ["novo", "abordado", "cativando", "briefing"];

/** Envia: congela o texto e leva o lead para a etapa Proposta. */
export async function markSent(formData: FormData) {
  await requireStaff();
  const id = z.uuid().parse(formData.get("id"));
  const contract = await setContractStatus(id, "enviado");
  if (contract.lead_id) {
    const lead = await getLead(contract.lead_id).catch(() => null);
    if (lead && EARLY_STAGES.includes(lead.stage)) await moveLead(lead.id, "proposta");
    revalidatePath(`/go-cl/${contract.lead_id}`);
  }
  revalidatePath(`/go-cl/contratos/${id}`);
  revalidatePath("/go-cl");
}

/** Volta um contrato enviado para rascunho (para corrigir antes da assinatura). */
export async function backToDraft(formData: FormData) {
  await requireStaff();
  const id = z.uuid().parse(formData.get("id"));
  const contract = await getContract(id);
  if (contract.status !== "enviado") return;
  await setContractStatus(id, "rascunho");
  revalidatePath(`/go-cl/contratos/${id}`);
}

export type SignState = { error?: string; ok?: string } | null;

/** Assina: o banco cria o cliente, o projeto inicial e o lançamento para o financeiro. */
export async function markSigned(_: SignState, formData: FormData): Promise<SignState> {
  await requireStaff();
  const id = z.uuid().safeParse(formData.get("id"));
  const name = String(formData.get("signed_by_name") ?? "").trim();
  if (!id.success) return { error: "Contrato inválido." };
  if (!name) return { error: "Informe quem assinou pelo contratante." };

  const contract = await getContract(id.data);
  if (contract.status !== "enviado") return { error: "Marque o contrato como enviado antes de registrar a assinatura." };

  await setContractStatus(id.data, "assinado", name);
  revalidatePath(`/go-cl/contratos/${id.data}`);
  revalidatePath("/go-cl");
  if (contract.lead_id) revalidatePath(`/go-cl/${contract.lead_id}`);
  return { ok: "Contrato assinado." };
}

export async function cancelContract(formData: FormData) {
  await requireStaff();
  const id = z.uuid().parse(formData.get("id"));
  const contract = await getContract(id);
  if (contract.status === "assinado") return;
  await setContractStatus(id, "cancelado");
  revalidatePath(`/go-cl/contratos/${id}`);
  if (contract.lead_id) revalidatePath(`/go-cl/${contract.lead_id}`);
}
