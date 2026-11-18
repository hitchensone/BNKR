"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireSession, requireStaff, todaySP } from "@/lib/data/session";
import { createChannel, deleteKnowledge, openAssistant, openDirect, saveKnowledge } from "@/lib/data/chat";
import { answer, type AssistantResult } from "@/lib/chat/assistant";

export type ChatFormState = { error?: string } | null;

export async function openDirectAction(_: ChatFormState, formData: FormData): Promise<ChatFormState> {
  await requireStaff();
  const parsed = z.uuid().safeParse(formData.get("user_id"));
  if (!parsed.success) return { error: "Escolha uma pessoa da equipe." };
  let id: string;
  try {
    id = await openDirect(parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/bunker-chat", "layout");
  redirect(`/bunker-chat/${id}`);
}

const ChannelSchema = z.object({
  name: z.string().trim().toLowerCase()
    .transform((v) => v.replace(/^#/, "").replace(/\s+/g, "-"))
    .pipe(z.string().regex(/^[a-z0-9à-ú_-]{2,40}$/, "Use de 2 a 40 letras, números ou hífen.")),
  description: z.string().trim().transform((v) => v || null),
});

export async function createChannelAction(_: ChatFormState, formData: FormData): Promise<ChatFormState> {
  await requireStaff();
  const parsed = ChannelSchema.safeParse({ name: formData.get("name") ?? "", description: formData.get("description") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  let id: string;
  try {
    id = await createChannel(parsed.data.name, parsed.data.description);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/bunker-chat", "layout");
  redirect(`/bunker-chat/${id}`);
}

/** Abre a conversa particular com o assistente. */
export async function openAssistantAction() {
  await requireStaff();
  const id = await openAssistant();
  revalidatePath("/bunker-chat", "layout");
  redirect(`/bunker-chat/${id}`);
}

/** Chamado depois de enviar uma mensagem: o assistente responde se foi chamado. */
export async function askAssistant(channelId: string, messageId: string): Promise<AssistantResult> {
  const session = await requireSession();
  if (!z.uuid().safeParse(channelId).success || !z.uuid().safeParse(messageId).success) return { error: "Mensagem inválida." };
  return answer(session, channelId, messageId, await todaySP());
}

// ---------------------------------------------------------------------
// Base de conhecimento (treinar o assistente)
// ---------------------------------------------------------------------
export type KnowledgeState = { ok?: string; error?: string } | null;

const KnowledgeSchema = z.object({
  id: z.string().transform((v) => v || null).pipe(z.uuid().nullable()),
  title: z.string().trim().min(1, "Dê um título.").max(120, "Título muito longo."),
  content: z.string().trim().min(1, "Escreva o conteúdo.").max(8000, "Conteúdo muito longo (máx. 8.000 caracteres)."),
  audience: z.enum(["equipe", "todos"]),
  active: z.boolean(),
});

export async function saveKnowledgeAction(_: KnowledgeState, formData: FormData): Promise<KnowledgeState> {
  await requireAdmin();
  const parsed = KnowledgeSchema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    content: formData.get("content") ?? "",
    audience: formData.get("audience"),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os campos." };
  try {
    await saveKnowledge(parsed.data);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/bunker-chat/treinar");
  return { ok: parsed.data.id ? "Atualizado." : "Adicionado à base." };
}

export async function deleteKnowledgeAction(formData: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(formData.get("id"));
  if (id.success) await deleteKnowledge(id.data);
  revalidatePath("/bunker-chat/treinar");
}
