"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/data/session";
import { getBriefingByLead, saveBriefing } from "@/lib/data/contracts";

const text = z.string().trim().transform((v) => v || null);
const clean = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);

const Goal = z.object({ objetivo: z.string(), metrica: z.string().optional(), meta: z.string().optional() });
const Campaign = z.object({
  nome: z.string(),
  canais: z.array(z.string()).optional(),
  periodo: z.string().optional(),
  descricao: z.string().optional(),
});
const Deliverable = z.object({
  item: z.string(),
  quantidade: z.number().int().positive().optional(),
  periodicidade: z.string().optional(),
});

function jsonList<T extends z.ZodType>(item: T) {
  return z.string().transform((raw, ctx) => {
    try {
      return z.array(item).parse(JSON.parse(raw || "[]"));
    } catch {
      ctx.addIssue({ code: "custom", message: "Lista inválida." });
      return z.NEVER;
    }
  });
}

const BriefingSchema = z.object({
  lead_id: z.uuid(),
  status: z.enum(["rascunho", "validado"]),
  business_summary: text,
  target_audience: text,
  brand_guidelines: text,
  competitors: text,
  purpose: text,
  goals: jsonList(Goal),
  campaigns: jsonList(Campaign),
  deliverables: jsonList(Deliverable),
  expected_results: text,
  budget_range: text,
  deadline: z.string().transform((v) => v || null),
  notes: text,
});

export type BriefingState = { ok?: string; error?: string } | null;

export async function saveBriefingAction(_: BriefingState, formData: FormData): Promise<BriefingState> {
  await requireStaff();
  const parsed = BriefingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const d = parsed.data;
  // Descarta linhas vazias e espaços sobrando.
  const goals = d.goals
    .filter((g) => g.objetivo.trim())
    .map((g) => ({ objetivo: g.objetivo.trim(), metrica: clean(g.metrica), meta: clean(g.meta) }));
  const campaigns = d.campaigns
    .filter((c) => c.nome.trim())
    .map((c) => ({
      nome: c.nome.trim(),
      canais: c.canais?.map((x) => x.trim()).filter(Boolean),
      periodo: clean(c.periodo),
      descricao: clean(c.descricao),
    }));
  const deliverables = d.deliverables
    .filter((x) => x.item.trim())
    .map((x) => ({ item: x.item.trim(), quantidade: x.quantidade, periodicidade: clean(x.periodicidade) }));

  if (d.status === "validado" && deliverables.length === 0 && campaigns.length === 0) {
    return { error: "Para validar, inclua ao menos uma entrega ou campanha. Elas formam o escopo do contrato." };
  }

  const existing = await getBriefingByLead(d.lead_id);
  await saveBriefing({ ...d, id: existing?.id, goals, campaigns, deliverables });

  revalidatePath(`/go-cl/${d.lead_id}`);
  revalidatePath(`/go-cl/${d.lead_id}/briefing`);
  return { ok: d.status === "validado" ? "Briefing validado." : "Rascunho salvo." };
}
