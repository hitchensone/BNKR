"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/data/session";
import { createLead, moveLead } from "@/lib/data/leads";
import type { LeadStage } from "@/lib/types";
import { LEAD_STAGES } from "@/lib/go-cl/stages";

const optional = z.string().trim().transform((v) => v || null);

const LeadSchema = z.object({
  company_name: z.string().trim().min(1, "Informe a empresa."),
  contact_name: optional,
  phone: optional,
  instagram: optional,
  segment: optional,
  city: optional,
  source: optional,
  estimated_value: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v.replace(/\./g, "").replace(",", ".")) : null))
    .refine((v) => v === null || Number.isFinite(v), "Valor inválido."),
});

export async function addLead(_: string | null, formData: FormData) {
  const session = await requireStaff();
  const parsed = LeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;

  await createLead({ ...parsed.data, owner_id: session.userId });
  revalidatePath("/go-cl");
  return null;
}

export async function changeStage(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id"));
  const stage = String(formData.get("stage")) as LeadStage;
  if (!LEAD_STAGES.some((s) => s.id === stage)) return;
  await moveLead(id, stage);
  revalidatePath("/go-cl");
  revalidatePath(`/go-cl/${id}`);
}
