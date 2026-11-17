import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types";

/** Usuário logado e seus papéis. Cacheado por requisição. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role, client_id").eq("user_id", userId),
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
  ]);

  const list = (roles ?? []) as { role: AppRole; client_id: string | null }[];
  return {
    userId,
    name: profile?.full_name ?? (data.claims.email as string | undefined) ?? "",
    roles: list.map((r) => r.role),
    clientIds: list.filter((r) => r.client_id).map((r) => r.client_id as string),
    isStaff: list.some((r) => r.role !== "client"),
  };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  return session;
}

export async function requireStaff() {
  const session = await requireSession();
  if (!session.isStaff) redirect("/");
  return session;
}
