"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: string | null, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return "E-mail ou senha incorretos.";

  // Primeiro acesso do sistema: o primeiro usuário vira owner.
  await supabase.rpc("claim_ownership");

  const back = String(formData.get("voltar") || "/");
  redirect(back.startsWith("/") ? back : "/");
}
