import { createClient } from "@/lib/supabase/server";
import type { RecurringItem, Transaction } from "@/lib/go-grand/types";

// Camada de dados do GO GRAND. O RLS do banco já restringe tudo à administração.

/** Gera as parcelas das recorrências até o fim do mês seguinte (idempotente). */
export async function generateRecurring() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("grand_generate");
  if (error) throw error;
}

export async function listTransactions(from: string, to: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("due_date", from)
    .lte("due_date", to)
    .order("due_date")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })) as Transaction[];
}

export async function listRecurring() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_items")
    .select("*")
    .order("active", { ascending: false })
    .order("kind")
    .order("description");
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as RecurringItem[];
}

export type TransactionInput = Omit<Transaction, "id" | "client_id" | "contract_id" | "recurring_id">;

export async function createTransaction(input: TransactionInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert(input);
  if (error) throw error;
}

export async function setTransactionPaid(id: string, paidAt: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ paid_at: paidAt }).eq("id", id);
  if (error) throw error;
}

/** Remove só lançamentos manuais (os de recorrência/contrato voltariam na próxima geração). */
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id).is("recurring_id", null).is("contract_id", null);
  if (error) throw error;
}

export type RecurringInput = Pick<RecurringItem, "kind" | "category" | "description" | "amount" | "day_of_month" | "start_date" | "end_date" | "notes">;

export async function createRecurring(input: RecurringInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_items").insert(input);
  if (error) throw error;
}

/**
 * Encerra uma recorrência na data informada. Parcelas futuras ainda não
 * pagas são removidas; o histórico fica.
 */
export async function endRecurring(id: string, endDate: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_items").update({ active: false, end_date: endDate }).eq("id", id);
  if (error) throw error;
  const { error: delError } = await supabase
    .from("transactions")
    .delete()
    .eq("recurring_id", id)
    .is("paid_at", null)
    .gt("due_date", endDate);
  if (delError) throw delError;
}
