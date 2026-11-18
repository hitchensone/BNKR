// Regras puras do BUNKER CHAT (testáveis sem banco).

export type ChatKind = "canal" | "direto" | "projeto";

export interface ChatMessage {
  id: string;
  channel_id: string;
  author_id: string | null;
  author_name: string | null;
  kind: "usuario" | "assistente" | "sistema";
  body: string;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface ChatSummary {
  id: string;
  kind: ChatKind;
  title: string;
  subtitle: string | null;
  icon: string;
  unread: number;
  last_message_at: string | null;
  last_body: string | null;
  last_author: string | null;
  archived: boolean;
  project_id: string | null;
}

const TZ = "America/Sao_Paulo";
const dayFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long" });

/** Dia (YYYY-MM-DD) no horário de Brasília. */
export const dayOf = (iso: string) => dayFmt.format(new Date(iso));
export const timeOf = (iso: string) => timeFmt.format(new Date(iso));

function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** "Hoje", "Ontem" ou "5 de dezembro". */
export function dayLabel(day: string, today: string) {
  if (day === today) return "Hoje";
  if (day === shiftDay(today, -1)) return "Ontem";
  return longFmt.format(new Date(`${day}T12:00:00-03:00`));
}

/** Horário curto para a lista: hora se for hoje, "ontem" ou dd/mm. */
export function listTime(iso: string | null, today: string) {
  if (!iso) return "";
  const day = dayOf(iso);
  if (day === today) return timeOf(iso);
  if (day === shiftDay(today, -1)) return "ontem";
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

export type MessageGroup = { day: string; items: (ChatMessage & { first: boolean })[] };

/**
 * Agrupa por dia. `first` marca a primeira mensagem de uma sequência do
 * mesmo autor (mostra nome); sequências quebram depois de 5 minutos.
 */
export function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let prev: ChatMessage | null = null;
  for (const m of messages) {
    const day = dayOf(m.created_at);
    let group = groups.at(-1);
    if (!group || group.day !== day) {
      group = { day, items: [] };
      groups.push(group);
      prev = null;
    }
    const sameRun =
      prev !== null &&
      prev.author_id === m.author_id &&
      prev.kind === m.kind &&
      new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
    group.items.push({ ...m, first: !sameRun });
    prev = m;
  }
  return groups;
}

/** Junta uma mensagem nova (ou atualizada) à lista, sem duplicar e em ordem. */
export function upsertMessage(list: ChatMessage[], msg: ChatMessage) {
  const i = list.findIndex((m) => m.id === msg.id);
  if (i >= 0) {
    const next = list.slice();
    next[i] = msg;
    return next;
  }
  const next = [...list, msg];
  if (list.length && list[list.length - 1]!.created_at > msg.created_at) {
    next.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return next;
}

/** Torna links clicáveis: devolve partes de texto e URLs. */
export function linkify(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  const re = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], href: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export const initialsOf = (name: string | null | undefined) =>
  (name ?? "").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
