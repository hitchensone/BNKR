import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ClientTask, ClientUser, FileRequest, PortalFile, PortalProject, ProjectStatus, ProjectUpdate, Stage, StageStatus,
} from "@/lib/go-there/types";

// Camada de dados do GO THERE. O RLS decide o que cada um vê:
// a equipe vê tudo; o cliente, só os próprios projetos visíveis.

const PROJECT_FIELDS = "id, client_id, name, description, status, starts_on, ends_on, visible_to_client, client:clients(name, trade_name)";

export async function listProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`${PROJECT_FIELDS}, project_stages(status, position), file_requests(status)`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as (PortalProject & {
    project_stages: Pick<Stage, "status" | "position">[];
    file_requests: Pick<FileRequest, "status">[];
  })[];
}

export async function getProject(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(PROJECT_FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as PortalProject | null;
}

export async function getProjectDetails(projectId: string) {
  const supabase = await createClient();
  const [stages, updates, requests, files, tasks, columns] = await Promise.all([
    supabase.from("project_stages").select("*").eq("project_id", projectId).order("position").order("created_at"),
    supabase.from("project_updates").select("id, project_id, body, created_at, created_by").eq("project_id", projectId)
      .order("created_at", { ascending: false }).limit(30),
    supabase.from("file_requests").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("files").select("id, bucket, path, name, mime_type, size_bytes, visibility, request_id, created_at, uploaded_by")
      .eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("id, title, column_id, due_date, completed_at").eq("project_id", projectId)
      .eq("visible_to_client", true).is("parent_id", null).order("position"),
    supabase.from("task_columns").select("id, name, position, is_done, tint").order("position"),
  ]);
  for (const r of [stages, updates, requests, files, tasks, columns]) if (r.error) throw r.error;

  // Nomes de quem publicou (perfis visíveis pelo RLS; cliente vê só o próprio).
  const authorIds = [...new Set((updates.data ?? []).map((u) => u.created_by).filter(Boolean))] as string[];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const fileRows = files.data ?? [];
  const urls = await Promise.all(
    fileRows.map((f) =>
      supabase.storage.from(f.bucket).createSignedUrl(f.path, 60 * 60, { download: f.name }).then((r) => r.data?.signedUrl ?? null),
    ),
  );

  return {
    stages: (stages.data ?? []) as Stage[],
    clientTasks: (tasks.data ?? []).map((t) => ({ ...t, column: (columns.data ?? []).find((c) => c.id === t.column_id) ?? null })) as ClientTask[],
    updates: (updates.data ?? []).map((u) => ({ ...u, author: names.get(u.created_by) ?? "GO Bunker!" })) as ProjectUpdate[],
    requests: (requests.data ?? []) as FileRequest[],
    // Caminho interno não sai do servidor; vai só o link assinado.
    files: fileRows.map((f, i) => ({
      id: f.id, name: f.name, mime_type: f.mime_type, size_bytes: f.size_bytes, visibility: f.visibility,
      request_id: f.request_id, created_at: f.created_at, uploaded_by: f.uploaded_by, url: urls[i],
    })) as PortalFile[],
  };
}

export async function listClients() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("id, name, trade_name").order("name");
  if (error) throw error;
  return data as { id: string; name: string; trade_name: string | null }[];
}

export async function createProject(input: { client_id: string; name: string; description: string | null; ends_on: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").insert({ ...input, status: "em_andamento" }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateProject(id: string, patch: { status?: ProjectStatus; visible_to_client?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function addStage(input: { project_id: string; title: string; due_date: string | null }) {
  const supabase = await createClient();
  const { data: last } = await supabase.from("project_stages").select("position").eq("project_id", input.project_id)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("project_stages").insert({ ...input, position: (last?.position ?? -1) + 1 });
  if (error) throw error;
}

export async function setStageStatus(id: string, status: StageStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_stages").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteStage(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_stages").delete().eq("id", id);
  if (error) throw error;
}

export async function addUpdate(projectId: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_updates").insert({ project_id: projectId, body });
  if (error) throw error;
}

export async function createRequest(input: Pick<FileRequest, "project_id" | "direction" | "title" | "description" | "due_date"> & { created_by: string }) {
  const supabase = await createClient();
  const { error } = await supabase.from("file_requests").insert(input);
  if (error) throw error;
}

export async function setRequestStatus(id: string, status: FileRequest["status"]) {
  const supabase = await createClient();
  const { error } = await supabase.from("file_requests").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function registerFile(input: {
  path: string; name: string; mime_type: string | null; size_bytes: number | null;
  client_id: string; project_id: string; request_id: string | null;
  visibility: "interno" | "cliente"; uploaded_by: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("files").insert({ ...input, bucket: "arquivos" });
  if (error) {
    // Sem registro, o arquivo enviado não serve: remove do armazenamento.
    await supabase.storage.from("arquivos").remove([input.path]);
    throw error;
  }
}

export async function setFileVisibility(id: string, visibility: "interno" | "cliente") {
  const supabase = await createClient();
  const { error } = await supabase.from("files").update({ visibility }).eq("id", id);
  if (error) throw error;
}

export async function deleteFile(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("files").select("bucket, path").eq("id", id).single();
  if (error) throw error;
  await supabase.storage.from(data.bucket).remove([data.path]);
  const { error: delError } = await supabase.from("files").delete().eq("id", id);
  if (delError) throw delError;
}

// ---------------------------------------------------------------------
// Acesso do cliente (precisa da SUPABASE_SECRET_KEY no servidor)
// ---------------------------------------------------------------------
export const canCreateAccess = () => Boolean(process.env.SUPABASE_SECRET_KEY);

export async function listClientUsers(clientId: string) {
  const supabase = await createClient();
  const { data: roles, error } = await supabase.from("user_roles").select("user_id").eq("role", "client").eq("client_id", clientId);
  if (error) throw error;
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [] as ClientUser[];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  return ids.map((id) => ({ user_id: id, name: names.get(id) ?? null }));
}

/** Cria o login do cliente com senha temporária. Retorna a senha para repassar. */
export async function createClientAccess(clientId: string, email: string, fullName: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta configurar a SUPABASE_SECRET_KEY no servidor.");

  const password = temporaryPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    throw new Error(error.message.includes("already") ? "Já existe um login com esse e-mail." : error.message);
  }
  const { error: roleError } = await admin.from("user_roles").insert({ user_id: data.user.id, role: "client", client_id: clientId });
  if (roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw roleError;
  }
  return password;
}

/** Remove o acesso do cliente (apaga o login). */
export async function removeClientAccess(clientId: string, userId: string) {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta configurar a SUPABASE_SECRET_KEY no servidor.");
  // Só remove se o login for mesmo deste cliente (e nunca alguém da equipe).
  const { data: roles } = await admin.from("user_roles").select("role, client_id").eq("user_id", userId);
  const onlyThisClient = (roles ?? []).length > 0 && (roles ?? []).every((r) => r.role === "client" && r.client_id === clientId);
  if (!onlyThisClient) throw new Error("Este login não pertence só a este cliente.");
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

function temporaryPassword() {
  // Sem caracteres ambíguos (0/O, 1/l/I) para ditar ou copiar sem erro.
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
