import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Cliente com a chave secreta: ignora o RLS. Só para operações de
 * administração no servidor (criar acesso de cliente). Quem chama
 * precisa checar antes se o usuário é admin.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(supabaseUrl, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
