"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireStaff } from "@/lib/data/session";
import {
  addComment, addTemplateItem, applyTemplate, createColumn, createStaffMember, createTask, createTemplate,
  deleteColumn, deleteTask, deleteTemplate, deleteTemplateItem, getTask, moveColumn, removeStaffMember,
  updateColumn, updateTask,
} from "@/lib/data/work";

export type UpState = { ok?: string; error?: string; password?: string } | null;

const uuid = z.uuid();
const optUuid = z.string().transform((v) => (v ? v : null)).pipe(z.uuid().nullable());
const optDate = z.string().transform((v) => v || null);
const text = z.string().trim().transform((v) => v || null);
const priority = z.enum(["baixa", "normal", "alta", "urgente"]);
const TINTS = ["red", "yellow", "green", "blue", "purple", "orange"] as const;

function refresh(projectId: string, taskId?: string) {
  revalidatePath(`/go-up/${projectId}`);
  revalidatePath("/go-up");
  revalidatePath("/go-up/minhas");
  revalidatePath(`/go-there/${projectId}`);
  if (taskId) revalidatePath(`/go-up/demanda/${taskId}`);
}

// ---------------------------------------------------------------------
// Demandas
// ---------------------------------------------------------------------
const NewTask = z.object({
  project_id: uuid,
  column_id: uuid,
  title: z.string().trim().min(1, "Dê um título à demanda."),
  priority,
  assignee_id: optUuid,
  due_date: optDate,
  stage_id: optUuid,
  parent_id: optUuid.optional(),
});

export async function newTask(_: UpState, formData: FormData): Promise<UpState> {
  const session = await requireStaff();
  const parsed = NewTask.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await createTask({ ...parsed.data, requested_by: session.userId });
  refresh(parsed.data.project_id, parsed.data.parent_id ?? undefined);
  return { ok: "Demanda criada." };
}

/** Move a demanda de coluna (arrastar ou escolher na lista). */
export async function moveTask(taskId: string, columnId: string) {
  await requireStaff();
  const task = await getTask(uuid.parse(taskId));
  if (!task) return;
  await updateTask(task.id, { column_id: uuid.parse(columnId), position: Date.now() / 1000 });
  refresh(task.project_id, task.parent_id ?? task.id);
}

export async function moveTaskForm(formData: FormData) {
  await moveTask(String(formData.get("id")), String(formData.get("column_id")));
}

const EditTask = z.object({
  id: uuid,
  title: z.string().trim().min(1, "O título não pode ficar vazio."),
  description: text,
  priority,
  assignee_id: optUuid,
  due_date: optDate,
  stage_id: optUuid,
  column_id: uuid,
  visible_to_client: z.string().optional().transform((v) => v === "1"),
});

export async function saveTask(_: UpState, formData: FormData): Promise<UpState> {
  await requireStaff();
  const parsed = EditTask.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const task = await getTask(parsed.data.id);
  if (!task) return { error: "Demanda não encontrada." };
  const { id, ...patch } = parsed.data;
  await updateTask(id, patch);
  refresh(task.project_id, id);
  return { ok: "Demanda salva." };
}

export async function removeTask(formData: FormData) {
  await requireStaff();
  const task = await getTask(uuid.parse(formData.get("id")));
  if (!task) return;
  await deleteTask(task.id);
  refresh(task.project_id, task.parent_id ?? undefined);
  if (!task.parent_id) redirect(`/go-up/${task.project_id}`);
}

export async function newComment(_: UpState, formData: FormData): Promise<UpState> {
  await requireStaff();
  const parsed = z.object({ task_id: uuid, body: z.string().trim().min(1, "Escreva o comentário.") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await addComment(parsed.data.task_id, parsed.data.body);
  revalidatePath(`/go-up/demanda/${parsed.data.task_id}`);
  return { ok: "Comentário enviado." };
}

export async function applyProjectTemplate(_: UpState, formData: FormData): Promise<UpState> {
  await requireStaff();
  const parsed = z
    .object({ project_id: uuid, template_id: z.string().min(1, "Escolha um modelo.").pipe(uuid), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha a data de início.") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const created = await applyTemplate(parsed.data.project_id, parsed.data.template_id, parsed.data.start);
  refresh(parsed.data.project_id);
  return { ok: `Modelo aplicado: ${created} demanda${created === 1 ? "" : "s"} e as etapas criadas.` };
}

// ---------------------------------------------------------------------
// Fluxo e modelos (admin)
// ---------------------------------------------------------------------
export async function newColumn(_: UpState, formData: FormData): Promise<UpState> {
  await requireAdmin();
  const parsed = z
    .object({ name: z.string().trim().min(1, "Dê um nome à coluna."), tint: z.enum(TINTS), is_done: z.string().optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await createColumn(parsed.data.name, parsed.data.tint, parsed.data.is_done === "1");
  revalidatePath("/go-up", "layout");
  return { ok: "Coluna criada." };
}

export async function editColumn(formData: FormData) {
  await requireAdmin();
  const id = uuid.parse(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const tint = z.enum(TINTS).parse(formData.get("tint"));
  await updateColumn(id, { ...(name && { name }), tint, is_done: formData.get("is_done") === "1" });
  revalidatePath("/go-up", "layout");
}

export async function shiftColumn(formData: FormData) {
  await requireAdmin();
  await moveColumn(uuid.parse(formData.get("id")), formData.get("dir") === "up" ? -1 : 1);
  revalidatePath("/go-up", "layout");
}

export async function removeColumn(formData: FormData) {
  await requireAdmin();
  await deleteColumn(uuid.parse(formData.get("id")), uuid.parse(formData.get("move_to")));
  revalidatePath("/go-up", "layout");
}

export async function newTemplate(_: UpState, formData: FormData): Promise<UpState> {
  await requireAdmin();
  const parsed = z.object({ name: z.string().trim().min(1, "Dê um nome ao modelo."), description: text }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await createTemplate(parsed.data.name, parsed.data.description);
  revalidatePath("/go-up/config");
  return { ok: "Modelo criado. Agora adicione etapas e demandas." };
}

export async function removeTemplate(formData: FormData) {
  await requireAdmin();
  await deleteTemplate(uuid.parse(formData.get("id")));
  revalidatePath("/go-up/config");
}

export async function newTemplateItem(_: UpState, formData: FormData): Promise<UpState> {
  await requireAdmin();
  const parsed = z
    .object({
      template_id: uuid,
      kind: z.enum(["etapa", "tarefa"]),
      title: z.string().trim().min(1, "Dê um nome ao item."),
      stage_title: text,
      offset_days: z.coerce.number().int().min(0, "Dias a partir do início (0 ou mais).").max(365),
      priority,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await addTemplateItem({ ...parsed.data, stage_title: parsed.data.kind === "tarefa" ? parsed.data.stage_title : null });
  revalidatePath("/go-up/config");
  return { ok: "Item adicionado." };
}

export async function removeTemplateItem(formData: FormData) {
  await requireAdmin();
  await deleteTemplateItem(uuid.parse(formData.get("id")));
  revalidatePath("/go-up/config");
}

// ---------------------------------------------------------------------
// Equipe (admin)
// ---------------------------------------------------------------------
export async function newStaff(_: UpState, formData: FormData): Promise<UpState> {
  await requireAdmin();
  const parsed = z
    .object({ full_name: z.string().trim().min(1, "Informe o nome."), email: z.email("E-mail inválido."), role: z.enum(["team", "admin"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const password = await createStaffMember(parsed.data.email.toLowerCase(), parsed.data.full_name, parsed.data.role);
    revalidatePath("/go-up/equipe");
    return { ok: `Acesso criado para ${parsed.data.email}.`, password };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o acesso." };
  }
}

export async function removeStaff(formData: FormData) {
  const session = await requireAdmin();
  await removeStaffMember(uuid.parse(formData.get("user_id")), session.userId);
  revalidatePath("/go-up/equipe");
}
