import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatMessage } from "./helpers";
import { ASSISTANT_NAME, mentionsAssistant, systemPrompt, toModelMessages, type AssistantContext } from "./prompt";

// Assistente Bunker: monta o contexto com o que quem pergunta pode ver
// (nas conversas de projeto, só o que o CLIENTE pode ver, porque ele lê a
// resposta), chama o modelo e grava a resposta na conversa.

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Channel = { id: string; kind: string; project_id: string | null; is_assistant: boolean };

const MAX_PER_HOUR = 30;
const STATUS_PROJ: Record<string, string> = {
  planejamento: "planejamento", em_andamento: "em andamento", pausado: "pausado", concluido: "concluído", cancelado: "cancelado",
};
const STATUS_POST: Record<string, string> = {
  aprovacao: "aguardando aprovação do cliente", ajustes: "em ajuste (cliente pediu mudanças)", aprovado: "aprovado",
  agendado: "agendado", publicado: "publicado",
};
const br = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "");
const brDateTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export const assistantEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function projectFacts(supabase: Supabase, projectId: string, today: string) {
  const soon = new Date(Date.now() + 30 * 864e5).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const [project, stages, requests, posts, tasks] = await Promise.all([
    supabase.from("projects").select("name, status, starts_on, ends_on, client:clients(name, trade_name)").eq("id", projectId).maybeSingle(),
    supabase.from("project_stages").select("title, status, due_date").eq("project_id", projectId).order("position"),
    supabase.from("file_requests").select("title, direction, status, due_date").eq("project_id", projectId).neq("status", "concluido"),
    supabase.from("posts").select("title, status, scheduled_at, network, format")
      .eq("project_id", projectId).in("status", ["aprovacao", "ajustes", "aprovado", "agendado", "publicado"])
      .gte("scheduled_at", weekAgo).lte("scheduled_at", soon).order("scheduled_at").limit(25),
    // Só demandas que o cliente vê (a resposta aparece para ele)
    supabase.from("tasks").select("title, due_date, completed_at").eq("project_id", projectId)
      .eq("visible_to_client", true).is("parent_id", null).is("completed_at", null).limit(20),
  ]);
  const p = project.data as unknown as { name: string; status: string; starts_on: string | null; ends_on: string | null; client: { name: string; trade_name: string | null } | null } | null;
  if (!p) return [];
  const facts = [
    `Projeto: ${p.name} — cliente ${p.client?.trade_name || p.client?.name} — situação: ${STATUS_PROJ[p.status] ?? p.status}` +
      `${p.starts_on ? ` — início ${br(p.starts_on)}` : ""}${p.ends_on ? ` — entrega prevista ${br(p.ends_on)}` : ""}.`,
  ];
  for (const s of stages.data ?? []) {
    facts.push(`Etapa "${s.title}": ${s.status === "concluida" ? "concluída" : s.status === "em_andamento" ? "em andamento" : "pendente"}${s.due_date ? ` (prazo ${br(s.due_date)})` : ""}.`);
  }
  for (const r of requests.data ?? []) {
    facts.push(`Pedido de arquivo "${r.title}" — ${r.direction === "agencia_pede" ? "a agência está aguardando o cliente enviar" : "o cliente pediu à agência"} — ${r.status === "respondido" ? "já respondido" : "em aberto"}${r.due_date ? `, prazo ${br(r.due_date)}` : ""}.`);
  }
  for (const t of tasks.data ?? []) {
    facts.push(`Em produção: "${t.title}"${t.due_date ? ` (previsão ${br(t.due_date)})` : ""}.`);
  }
  for (const post of posts.data ?? []) {
    facts.push(`Post "${post.title}" (${post.network}, ${post.format}) — ${brDateTime(post.scheduled_at!)} — ${STATUS_POST[post.status] ?? post.status}.`);
  }
  if (facts.length === 1) facts.push(`Ainda não há etapas, pedidos ou posts cadastrados neste projeto (consulta em ${br(today)}).`);
  return facts;
}

async function teamFacts(supabase: Supabase, userId: string, today: string) {
  const [projects, myTasks, waiting] = await Promise.all([
    supabase.from("projects").select("id, name, status, client:clients(name, trade_name), project_stages(title, status, position)")
      .in("status", ["planejamento", "em_andamento", "pausado"]).limit(40),
    supabase.from("tasks").select("title, due_date, project:projects(name)").eq("assignee_id", userId).is("completed_at", null).limit(30),
    supabase.from("posts").select("title, scheduled_at, status, project:projects(name, client:clients(name, trade_name))")
      .in("status", ["aprovacao", "ajustes"]).order("scheduled_at").limit(20),
  ]);
  const facts: string[] = [];
  for (const p of (projects.data ?? []) as unknown as { name: string; status: string; client: { name: string; trade_name: string | null } | null; project_stages: { title: string; status: string; position: number }[] }[]) {
    const current = [...p.project_stages].sort((a, b) => a.position - b.position).find((s) => s.status !== "concluida");
    facts.push(`Projeto ativo: ${p.client?.trade_name || p.client?.name} · ${p.name} (${STATUS_PROJ[p.status]})${current ? ` — etapa atual: ${current.title}` : ""}.`);
  }
  for (const t of (myTasks.data ?? []) as unknown as { title: string; due_date: string | null; project: { name: string } | null }[]) {
    const late = t.due_date && t.due_date < today;
    facts.push(`Demanda atribuída a quem pergunta: "${t.title}" (${t.project?.name})${t.due_date ? ` — prazo ${br(t.due_date)}${late ? " — ATRASADA" : ""}` : ""}.`);
  }
  for (const post of (waiting.data ?? []) as unknown as { title: string; scheduled_at: string | null; status: string; project: { name: string; client: { name: string; trade_name: string | null } | null } | null }[]) {
    facts.push(`Post aguardando cliente: "${post.title}" — ${post.project?.client?.trade_name || post.project?.client?.name}${post.scheduled_at ? ` — ${brDateTime(post.scheduled_at)}` : ""} — ${STATUS_POST[post.status]}.`);
  }
  return facts;
}

async function callModel(system: string, messages: { role: "user" | "assistant"; content: string }[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: process.env.ASSISTENTE_MODELO || "claude-haiku-5-5", max_tokens: 700, system, messages }),
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`modelo respondeu ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) throw new Error("resposta vazia");
  return text.slice(0, 4000);
}

export type AssistantResult = { message?: ChatMessage; error?: string } | null;

/** Responde à mensagem `messageId`, se ela chamou o assistente. */
export async function answer(
  session: { userId: string; name: string; isStaff: boolean },
  channelId: string,
  messageId: string,
  today: string,
): Promise<AssistantResult> {
  const supabase = await createClient();
  const [{ data: channel }, { data: msg }] = await Promise.all([
    supabase.from("chat_channels").select("id, kind, project_id, is_assistant").eq("id", channelId).maybeSingle(),
    supabase.from("chat_messages").select("body").eq("id", messageId).eq("channel_id", channelId).eq("author_id", session.userId).maybeSingle(),
  ]);
  const ch = channel as Channel | null;
  if (!ch || !msg) return { error: "Conversa não encontrada." };
  if (!ch.is_assistant && !mentionsAssistant(msg.body as string)) return null;
  if (ch.kind === "direto" && !ch.is_assistant) return { error: "O assistente não participa de conversas diretas. Use a conversa 🤖 Assistente." };

  const admin = createAdminClient();
  if (!assistantEnabled() || !admin) {
    return { error: session.isStaff ? "O assistente ainda não foi ligado: falta a chave ANTHROPIC_API_KEY no Netlify." : "O assistente está indisponível agora. A equipe vai responder por aqui." };
  }

  // Limite por pessoa: perguntas na última hora
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data: recent } = await supabase.from("chat_messages").select("body, channel:chat_channels(is_assistant)")
    .eq("author_id", session.userId).gte("created_at", since).limit(300);
  const asked = (recent ?? []).filter((r) => (r.channel as unknown as { is_assistant: boolean } | null)?.is_assistant || mentionsAssistant(r.body as string)).length;
  if (asked > MAX_PER_HOUR) return { error: "Muitas perguntas ao assistente na última hora. Tente daqui a pouco." };

  const forClient = ch.kind === "projeto";
  let knowledgeQuery = supabase.from("assistant_knowledge").select("title, content").eq("active", true).order("created_at");
  if (forClient) knowledgeQuery = knowledgeQuery.eq("audience", "todos");
  const [{ data: knowledge }, facts, { data: history }] = await Promise.all([
    knowledgeQuery,
    forClient && ch.project_id ? projectFacts(supabase, ch.project_id, today) : teamFacts(supabase, session.userId, today),
    supabase.from("chat_messages").select("id, channel_id, author_id, author_name, kind, body, edited_at, deleted_at, created_at")
      .eq("channel_id", channelId).order("created_at", { ascending: false }).limit(20),
  ]);

  const ctx: AssistantContext = {
    today,
    asker: { name: session.name, isStaff: session.isStaff },
    audience: forClient ? "cliente" : "equipe",
    knowledge: (knowledge ?? []) as { title: string; content: string }[],
    facts,
  };
  const messages = toModelMessages(((history ?? []) as ChatMessage[]).reverse());
  if (!messages.length) return null;

  let text: string;
  try {
    text = await callModel(systemPrompt(ctx), messages);
  } catch (e) {
    console.error("assistente:", (e as Error).message);
    return { error: "O assistente não conseguiu responder agora. Tente de novo em instantes." };
  }

  const { data: saved, error } = await admin.from("chat_messages")
    .insert({ channel_id: channelId, kind: "assistente", author_id: null, author_name: ASSISTANT_NAME, body: text })
    .select("id, channel_id, author_id, author_name, kind, body, edited_at, deleted_at, created_at").single();
  if (error) return { error: "Não foi possível gravar a resposta do assistente." };
  return { message: saved as ChatMessage };
}
