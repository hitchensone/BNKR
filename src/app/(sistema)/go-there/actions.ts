"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireSession, requireStaff } from "@/lib/data/session";
import {
  addStage, addUpdate, createClientAccess, createProject, createRequest, deleteFile, deleteStage, getProject,
  registerFile, removeClientAccess, setFileVisibility, setRequestStatus, setStageStatus, updateProject,
} from "@/lib/data/portal";

export type PortalState = { ok?: string; error?: string; password?: string } | null;

const uuid = z.uuid();
const text = z.string().trim().transform((v) => v || null);
const optDate = z.string().transform((v) => v || null);
const path = (projectId: string) => revalidatePath(`/go-there/${projectId}`);

// ---------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------
export async function newProject(_: PortalState, formData: FormData): Promise<PortalState> {
  await requireStaff();
  const parsed = z
    .object({ client_id: uuid, name: z.string().trim().min(1, "Dê um nome ao projeto."), description: text, ends_on: optDate })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message === "Invalid UUID" ? "Escolha o cliente." : parsed.error.issues[0].message };
  const id = await createProject(parsed.data);
  revalidatePath("/go-there");
  redirect(`/go-there/${id}`);
}

export async function changeProject(formData: FormData) {
  await requireStaff();
  const id = uuid.parse(formData.get("id"));
  const status = z.enum(["planejamento", "em_andamento", "pausado", "concluido", "cancelado"]).optional()
    .parse(formData.get("status") ?? undefined);
  const visible = formData.get("visible_to_client");
  await updateProject(id, { ...(status && { status }), ...(visible != null && { visible_to_client: visible === "1" }) });
  path(id);
  revalidatePath("/go-there");
}

export async function newStage(_: PortalState, formData: FormData): Promise<PortalState> {
  await requireStaff();
  const parsed = z
    .object({ project_id: uuid, title: z.string().trim().min(1, "Dê um nome à etapa."), due_date: optDate })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await addStage(parsed.data);
  path(parsed.data.project_id);
  return { ok: "Etapa adicionada." };
}

export async function changeStage(formData: FormData) {
  await requireStaff();
  const id = uuid.parse(formData.get("id"));
  const projectId = uuid.parse(formData.get("project_id"));
  await setStageStatus(id, z.enum(["pendente", "em_andamento", "concluida"]).parse(formData.get("status")));
  path(projectId);
}

export async function removeStage(formData: FormData) {
  await requireStaff();
  await deleteStage(uuid.parse(formData.get("id")));
  path(uuid.parse(formData.get("project_id")));
}

export async function postUpdate(_: PortalState, formData: FormData): Promise<PortalState> {
  await requireStaff();
  const parsed = z
    .object({ project_id: uuid, body: z.string().trim().min(1, "Escreva a atualização.") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await addUpdate(parsed.data.project_id, parsed.data.body);
  path(parsed.data.project_id);
  return { ok: "Publicado no mural." };
}

export async function changeRequest(formData: FormData) {
  await requireStaff();
  const projectId = uuid.parse(formData.get("project_id"));
  await setRequestStatus(uuid.parse(formData.get("id")), z.enum(["aberto", "respondido", "concluido"]).parse(formData.get("status")));
  path(projectId);
}

export async function changeFileVisibility(formData: FormData) {
  await requireStaff();
  const projectId = uuid.parse(formData.get("project_id"));
  await setFileVisibility(uuid.parse(formData.get("id")), z.enum(["interno", "cliente"]).parse(formData.get("visibility")));
  path(projectId);
}

export async function removeFile(formData: FormData) {
  await requireStaff();
  const projectId = uuid.parse(formData.get("project_id"));
  await deleteFile(uuid.parse(formData.get("id")));
  path(projectId);
}

export async function newClientAccess(_: PortalState, formData: FormData): Promise<PortalState> {
  await requireAdmin();
  const parsed = z
    .object({
      client_id: uuid,
      project_id: uuid,
      full_name: z.string().trim().min(1, "Informe o nome da pessoa."),
      email: z.email("E-mail inválido."),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const password = await createClientAccess(parsed.data.client_id, parsed.data.email.toLowerCase(), parsed.data.full_name);
    path(parsed.data.project_id);
    return { ok: `Acesso criado para ${parsed.data.email}.`, password };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o acesso." };
  }
}

export async function revokeClientAccess(formData: FormData) {
  await requireAdmin();
  const projectId = uuid.parse(formData.get("project_id"));
  await removeClientAccess(uuid.parse(formData.get("client_id")), uuid.parse(formData.get("user_id")));
  path(projectId);
}

// ---------------------------------------------------------------------
// Equipe e cliente (o RLS decide o que cada um pode)
// ---------------------------------------------------------------------
export async function newRequest(_: PortalState, formData: FormData): Promise<PortalState> {
  const session = await requireSession();
  const parsed = z
    .object({
      project_id: uuid,
      title: z.string().trim().min(1, "Diga o que precisa."),
      description: text,
      due_date: optDate,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createRequest({
      ...parsed.data,
      direction: session.isStaff ? "agencia_pede" : "cliente_pede",
      created_by: session.userId,
    });
  } catch {
    return { error: "Não foi possível criar o pedido." };
  }
  path(parsed.data.project_id);
  return { ok: session.isStaff ? "Pedido enviado ao cliente." : "Pedido enviado à agência." };
}

/** Registra um arquivo já enviado ao armazenamento pelo navegador. */
export async function saveUploadedFile(input: {
  path: string; name: string; mime_type: string | null; size_bytes: number | null;
  project_id: string; request_id: string | null; visibility: "interno" | "cliente";
}): Promise<{ error?: string }> {
  const session = await requireSession();
  const parsed = z
    .object({
      path: z.string().min(1).max(400),
      name: z.string().min(1).max(255),
      mime_type: z.string().max(200).nullable(),
      size_bytes: z.number().int().nonnegative().nullable(),
      project_id: uuid,
      request_id: uuid.nullable(),
      visibility: z.enum(["interno", "cliente"]),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Dados do arquivo inválidos." };

  const project = await getProject(parsed.data.project_id);
  if (!project) return { error: "Projeto não encontrado." };
  // O caminho precisa estar dentro da pasta do cliente/projeto.
  if (!parsed.data.path.startsWith(`${project.client_id}/${project.id}/`)) return { error: "Caminho inválido." };

  try {
    await registerFile({
      ...parsed.data,
      client_id: project.client_id,
      visibility: session.isStaff ? parsed.data.visibility : "cliente",
      uploaded_by: session.userId,
    });
  } catch {
    return { error: "Não foi possível registrar o arquivo." };
  }
  path(project.id);
  return {};
}
