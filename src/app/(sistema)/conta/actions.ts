"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/data/session";

export type AccountState = { ok?: string; error?: string } | null;

export async function changePassword(_: AccountState, formData: FormData): Promise<AccountState> {
  await requireSession();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "Use uma senha diferente da atual." : "Não foi possível trocar a senha." };
  return { ok: "Senha alterada." };
}
