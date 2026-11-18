import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { initialsOf, type ChatKind, type ChatMessage, type ChatSummary } from "@/lib/chat/helpers";
import type { StaffMember } from "@/lib/go-up/types";

// Camada de dados do BUNKER CHAT. O RLS decide quem vê cada conversa.

type ChatRow = {
  id: string; kind: ChatKind; name: string | null; description: string | null; project_id: string | null;
  archived: boolean; last_message_at: string | null; unread: number; last_body: string | null;
  last_author: string | null; other_user: string | null;
};

type ProjectRow = { id: string; name: string; status: string; client: { name: string; trade_name: string | null } | null };

/** Conversas de quem está logado, já com título, ícone e não lidas. */
export const listChats = cache(async (isStaff: boolean): Promise<ChatSummary[]> => {
  const supabase = await createClient();
  const [{ data: rows, error }, { data: projects }, staff, { data: bots }] = await Promise.all([
    supabase.rpc("my_chats"),
    supabase.from("projects").select("id, name, status, client:clients(name, trade_name)"),
    isStaff ? supabase.rpc("list_staff").then((r) => (r.data ?? []) as StaffMember[]) : Promise.resolve([] as StaffMember[]),
    supabase.from("chat_channels").select("id").eq("is_assistant", true),
  ]);
  const botIds = new Set((bots ?? []).map((b) => b.id as string));
  if (error) throw error;

  const projectMap = new Map(((projects ?? []) as unknown as ProjectRow[]).map((p) => [p.id, p]));
  const staffMap = new Map(staff.map((s) => [s.user_id, s.full_name]));

  return ((rows ?? []) as ChatRow[]).flatMap((r): ChatSummary[] => {
    const base = {
      id: r.id, kind: r.kind, unread: r.unread, last_message_at: r.last_message_at, last_body: r.last_body,
      last_author: r.last_author, archived: r.archived, project_id: r.project_id,
    };
    if (r.kind === "canal") return [{ ...base, title: r.name ?? "canal", subtitle: r.description, icon: "#" }];
    if (r.kind === "direto" && botIds.has(r.id)) {
      return [{ ...base, title: "Assistente Bunker", subtitle: "Sua conversa particular", icon: "🤖", last_author: r.last_author === "Assistente Bunker" ? "Assistente" : r.last_author }];
    }
    if (r.kind === "direto") {
      const person = staffMap.get(r.other_user ?? "") || "Conversa direta";
      return [{ ...base, title: person, subtitle: "Conversa direta", icon: initialsOf(person) }];
    }
    const p = projectMap.get(r.project_id ?? "");
    if (!p) return [];
    const client = p.client?.trade_name || p.client?.name || "Cliente";
    const finished = p.status === "concluido" || p.status === "cancelado";
    return [{
      ...base,
      archived: r.archived || finished,
      title: isStaff ? client : p.name,
      subtitle: isStaff ? p.name : "Conversa com a GO Bunker!",
      icon: "🛰️",
    }];
  });
});

export async function getChannel(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_channels").select("id, kind, name, description, project_id, is_assistant").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as { id: string; kind: ChatKind; name: string | null; description: string | null; project_id: string | null; is_assistant: boolean } | null;
}

/** Últimas mensagens da conversa, da mais antiga para a mais nova. */
export async function listMessages(channelId: string, limit = 150) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, channel_id, author_id, author_name, kind, body, edited_at, deleted_at, created_at")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ChatMessage[]).reverse();
}

export async function getProjectChannelId(projectId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("chat_channels").select("id").eq("project_id", projectId).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function openDirect(otherUserId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_direct_chat", { _other: otherUserId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createChannel(name: string, description: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("chat_channels").insert({ kind: "canal", name, description }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function openAssistant() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_assistant_chat");
  if (error) throw new Error(error.message);
  return data as string;
}

export type Knowledge = { id: string; title: string; content: string; audience: "equipe" | "todos"; active: boolean; updated_at: string };

export async function listKnowledge() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assistant_knowledge").select("id, title, content, audience, active, updated_at").order("created_at");
  if (error) throw error;
  return (data ?? []) as Knowledge[];
}

export async function saveKnowledge(k: { id: string | null; title: string; content: string; audience: "equipe" | "todos"; active: boolean }) {
  const supabase = await createClient();
  const { id, ...fields } = k;
  const { error } = id
    ? await supabase.from("assistant_knowledge").update(fields).eq("id", id)
    : await supabase.from("assistant_knowledge").insert(fields);
  if (error) throw new Error(error.message);
}

export async function deleteKnowledge(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("assistant_knowledge").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
