"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/data/session";
import { isTheme } from "@/lib/theme";

/** Guarda o tema no perfil, para valer em qualquer aparelho. */
export async function saveTheme(theme: string) {
  const session = await requireSession();
  if (!isTheme(theme)) return { error: "Tema inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ theme }).eq("id", session.userId);
  return error ? { error: "Não foi possível salvar o tema nesta conta." } : { ok: true };
}
