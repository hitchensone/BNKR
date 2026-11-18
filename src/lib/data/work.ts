import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Priority, StaffMember, Task, TaskColumn, TaskComment, Template } from "@/lib/go-up/types";

// Camada de dados do GO UP (demandas, fluxo, modelos e equipe).

export async function listColumns() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("task_columns").select("*").order("position");
  if (error) throw error;
  return data as TaskColumn[];
}

export async function listStaff() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_staff");
  if (error) throw error;
  return (data ?? []) as StaffMember[];
}

export async function listProjectTasks(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("project_id", projectId).order("position");
  if (error) throw error;
  return data as Task[];
}

/** Resumo por projeto para a visão geral: total, abertas e atrasadas. */
export async function listTaskCounts(today: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("project_id, completed_at, due_date").is("parent_id", null);
  if (error) throw error;
  const counts = new Map<string, { total: number; open: number; late: number }>();
  for (const t of data ?? []) {
    const c = counts.get(t.project_id) ?? { total: 0, open: 0, late: 0 };
    c.total++;
    if (!t.completed_at) {
      c.open++;
      if (t.due_date && t.due_date < today) c.late++;
    }
    counts.set(t.project_id, c);
  }
  return counts;
}

export async function listMyTasks(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, project:projects(name, client:clients(name, trade_name))")
    .eq("assignee_id", userId)
    .is("completed_at", null)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as (Task & { project: { name: string; client: { name: string; trade_name: string | null } | null } | null })[];
}

export async function getTask(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Task | null;
}

export async function getTaskDetails(id: string) {
  const supabase = await createClient();
  const [subtasks, comments] = await Promise.all([
    supabase.from("tasks").select("*").eq("parent_id", id).order("position").order("created_at"),
    supabase.from("task_comments").select("*").eq("task_id", id).order("created_at"),
  ]);
  if (subtasks.error) throw subtasks.error;
  if (comments.error) throw comments.error;
  return { subtasks: subtasks.data as Task[], comments: comments.data as TaskComment[] };
}

export type TaskInput = {
  project_id: string;
  column_id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  assignee_id: string | null;
  due_date: string | null;
  stage_id: string | null;
  parent_id?: string | null;
  visible_to_client?: boolean;
  requested_by: string;
};

export async function createTask(input: TaskInput) {
  const supabase = await createClient();
  // Entra no fim da coluna.
  const { data: last } = await supabase.from("tasks").select("position").eq("project_id", input.project_id)
    .eq("column_id", input.column_id).order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("tasks").insert({ ...input, position: (last?.position ?? 0) + 1 });
  if (error) throw error;
}

export async function updateTask(id: string, patch: Partial<Omit<Task, "id" | "project_id" | "created_at" | "completed_at">>) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function addComment(taskId: string, body: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").insert({ task_id: taskId, body });
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Fluxo (colunas)
// ---------------------------------------------------------------------
export async function createColumn(name: string, tint: string, is_done: boolean) {
  const supabase = await createClient();
  const cols = await listColumns();
  // Nova coluna entra antes das colunas de concluído.
  const firstDone = cols.find((c) => c.is_done);
  const position = is_done || !firstDone ? (cols.at(-1)?.position ?? -1) + 1 : firstDone.position;
  if (!is_done && firstDone) {
    for (const c of cols.filter((c) => c.position >= position).reverse()) {
      await supabase.from("task_columns").update({ position: c.position + 1 }).eq("id", c.id);
    }
  }
  const { error } = await supabase.from("task_columns").insert({ name, tint, is_done, position });
  if (error) throw error;
}

export async function updateColumn(id: string, patch: { name?: string; tint?: string; is_done?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_columns").update(patch).eq("id", id);
  if (error) throw error;
}

/** Troca a coluna de lugar com a vizinha. */
export async function moveColumn(id: string, direction: -1 | 1) {
  const supabase = await createClient();
  const cols = await listColumns();
  const i = cols.findIndex((c) => c.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= cols.length) return;
  await supabase.from("task_columns").update({ position: cols[j].position }).eq("id", cols[i].id);
  await supabase.from("task_columns").update({ position: cols[i].position }).eq("id", cols[j].id);
}

/** Exclui a coluna, levando as demandas dela para outra. */
export async function deleteColumn(id: string, moveTo: string) {
  const supabase = await createClient();
  if (id === moveTo) throw new Error("Escolha outra coluna para as demandas.");
  const { error: moveError } = await supabase.from("tasks").update({ column_id: moveTo }).eq("column_id", id);
  if (moveError) throw moveError;
  const { error } = await supabase.from("task_columns").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------
export async function listTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_templates")
    .select("*, items:template_items(*)")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((t) => ({ ...t, items: [...t.items].sort((a, b) => a.position - b.position) })) as Template[];
}

export async function applyTemplate(projectId: string, templateId: string, start: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_template", { _project_id: projectId, _template_id: templateId, _start: start });
  if (error) throw error;
  return data as number;
}

export async function createTemplate(name: string, description: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_templates").insert({ name, description });
  if (error) throw error;
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function addTemplateItem(item: Omit<Template["items"][number], "id" | "position">) {
  const supabase = await createClient();
  const { data: last } = await supabase.from("template_items").select("position").eq("template_id", item.template_id)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("template_items").insert({ ...item, position: (last?.position ?? -1) + 1 });
  if (error) throw error;
}

export async function deleteTemplateItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("template_items").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Equipe (precisa da SUPABASE_SECRET_KEY)
// ---------------------------------------------------------------------
export async function createStaffMember(email: string, fullName: string, role: "team" | "admin") {
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta configurar a SUPABASE_SECRET_KEY no servidor.");
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
  const password = `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error) throw new Error(error.message.includes("already") ? "Já existe um login com esse e-mail." : error.message);
  const { error: roleError } = await admin.from("user_roles").insert({ user_id: data.user.id, role });
  if (roleError) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw roleError;
  }
  return password;
}

/** Remove alguém da equipe. Nunca remove o owner nem a própria conta. */
export async function removeStaffMember(userId: string, currentUserId: string) {
  if (userId === currentUserId) throw new Error("Você não pode remover a própria conta.");
  const admin = createAdminClient();
  if (!admin) throw new Error("Falta configurar a SUPABASE_SECRET_KEY no servidor.");
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const list = (roles ?? []).map((r) => r.role);
  if (list.includes("owner")) throw new Error("O dono do sistema não pode ser removido.");
  if (!list.some((r) => r === "team" || r === "admin")) throw new Error("Esta pessoa não é da equipe.");
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
