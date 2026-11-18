"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, todaySP } from "@/lib/data/session";
import { createRecurring, createTransaction, deleteTransaction, endRecurring, setTransactionPaid } from "@/lib/data/finance";
import { isCategoryOf } from "@/lib/go-grand/categories";

const text = z.string().trim().transform((v) => v || null);
const money = z
  .string()
  .trim()
  .transform((v) => Number(v.replace(/[R$\s.]/g, "").replace(",", ".")))
  .refine((v) => Number.isFinite(v) && v > 0, "Informe um valor maior que zero.");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export type GrandFormState = { ok?: string; error?: string } | null;

const TransactionSchema = z
  .object({
    kind: z.enum(["entrada", "saida"]),
    category: z.string(),
    description: z.string().trim().min(1, "Descreva o lançamento."),
    amount: money,
    due_date: date,
    paid: z.string().optional(),
    payment_method: text,
    notes: text,
  })
  .refine((t) => isCategoryOf(t.category, t.kind), { message: "Escolha uma categoria." });

export async function addTransaction(_: GrandFormState, formData: FormData): Promise<GrandFormState> {
  await requireAdmin();
  const parsed = TransactionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { paid, ...data } = parsed.data;
  const today = await todaySP();
  await createTransaction({ ...data, paid_at: paid ? (data.due_date <= today ? data.due_date : today) : null });
  revalidatePath("/go-grand");
  return { ok: "Lançamento salvo." };
}

export async function togglePaid(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  const paid = formData.get("paid") === "1";
  await setTransactionPaid(id, paid ? await todaySP() : null);
  revalidatePath("/go-grand");
}

export async function removeTransaction(formData: FormData) {
  await requireAdmin();
  await deleteTransaction(z.uuid().parse(formData.get("id")));
  revalidatePath("/go-grand");
}

const RecurringSchema = z
  .object({
    kind: z.enum(["entrada", "saida"]),
    category: z.string(),
    description: z.string().trim().min(1, "Descreva a recorrência."),
    amount: money,
    day_of_month: z.coerce.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
    start_date: date,
    end_date: z.string().transform((v) => v || null),
    notes: text,
  })
  .refine((r) => isCategoryOf(r.category, r.kind), { message: "Escolha uma categoria." })
  .refine((r) => !r.end_date || r.end_date >= r.start_date, { message: "O fim deve ser depois do início." });

export async function addRecurring(_: GrandFormState, formData: FormData): Promise<GrandFormState> {
  await requireAdmin();
  const parsed = RecurringSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await createRecurring(parsed.data);
  // As parcelas são geradas ao abrir o painel (grand_generate).
  revalidatePath("/go-grand");
  revalidatePath("/go-grand/recorrentes");
  return { ok: "Recorrência criada." };
}

export async function stopRecurring(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().parse(formData.get("id"));
  await endRecurring(id, await todaySP());
  revalidatePath("/go-grand");
  revalidatePath("/go-grand/recorrentes");
}
