"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/data/session";
import { logInteraction, updateLead } from "@/lib/data/leads";
import type { ContactChannel } from "@/lib/types";

const CHANNELS = ["whatsapp", "instagram", "email", "ligacao", "reuniao", "presencial", "outro"] as const;
const optional = z.string().trim().transform((v) => v || null);

/** "2026-11-20T10:00" (campo datetime-local) no horário de Brasília → ISO. */
function fromLocalDateTime(value: string) {
  return value ? new Date(`${value}:00-03:00`).toISOString() : null;
}

const LeadInfoSchema = z.object({
  id: z.uuid(),
  company_name: z.string().trim().min(1, "Informe a empresa."),
  contact_name: optional,
  contact_role: optional,
  phone: optional,
  email: optional.refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido."),
  instagram: optional.transform((v) => (v ? v.replace(/^@/, "") : v)),
  website: optional,
  segment: optional,
  city: optional,
  source: optional,
  temperature: z.enum(["frio", "morno", "quente"]),
  estimated_value: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v.replace(/\./g, "").replace(",", ".")) : null))
    .refine((v) => v === null || Number.isFinite(v), "Valor inválido."),
  next_action: optional,
  next_action_at: z.string().transform(fromLocalDateTime),
  notes: optional,
});

export type FormState = { ok?: string; error?: string } | null;

export async function saveLeadInfo(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = LeadInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, ...data } = parsed.data;
  await updateLead(id, data);
  revalidatePath(`/go-cl/${id}`);
  revalidatePath("/go-cl");
  return { ok: "Dados salvos." };
}

const InteractionSchema = z.object({
  lead_id: z.uuid(),
  channel: z.enum(CHANNELS),
  direction: z.enum(["saida", "entrada"]),
  summary: z.string().trim().min(1, "Descreva o contato."),
});

export async function addInteraction(_: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = InteractionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await logInteraction({ ...parsed.data, template_id: null });
  revalidatePath(`/go-cl/${parsed.data.lead_id}`);
  return { ok: "Contato registrado." };
}

/** Registra no histórico que uma mensagem pronta foi usada. */
export async function recordTemplateUse(leadId: string, templateId: string, channel: ContactChannel, templateName: string) {
  await requireStaff();
  if (!z.uuid().safeParse(leadId).success || !CHANNELS.includes(channel as (typeof CHANNELS)[number])) return;
  await logInteraction({
    lead_id: leadId,
    template_id: templateId,
    channel,
    direction: "saida",
    summary: `Mensagem enviada: ${templateName}`,
  });
  revalidatePath(`/go-cl/${leadId}`);
}
