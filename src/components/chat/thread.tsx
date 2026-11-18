"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dayLabel, groupMessages, initialsOf, linkify, timeOf, upsertMessage, type ChatMessage } from "@/lib/chat/helpers";
import { createClient } from "@/lib/supabase/client";
import { askAssistant } from "@/app/(sistema)/bunker-chat/actions";
import { mentionsAssistant } from "@/lib/chat/prompt";
import { cx } from "../ui";
import { Icon3D } from "@/components/icon3d";

type Pending = ChatMessage & { failed?: boolean };

function Body({ text }: { text: string }) {
  return (
    <>
      {linkify(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 [overflow-wrap:anywhere]">{p.text}</a>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** Conversa aberta: mensagens em tempo real e caixa de envio. */
export function ChatThread({
  channelId,
  header,
  initialMessages,
  me,
  today,
  placeholder,
  assistant = "mention",
}: {
  /** "auto": responde toda mensagem; "mention": só com @assistente; "off": não participa */
  assistant?: "auto" | "mention" | "off";
  channelId: string;
  header: ReactNode;
  initialMessages: ChatMessage[];
  me: { id: string; name: string };
  today: string;
  placeholder: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Pending[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);

  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") void supabase.rpc("mark_chat_read", { _channel_id: channelId });
  }, [supabase, channelId]);

  // Tempo real: novas mensagens e edições/exclusões desta conversa
  useEffect(() => {
    markRead();
    const channel = supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setMessages((list) => upsertMessage(list, payload.new as ChatMessage));
          if (payload.eventType === "INSERT") markRead();
        },
      )
      .subscribe();
    document.addEventListener("visibilitychange", markRead);
    return () => {
      document.removeEventListener("visibilitychange", markRead);
      supabase.removeChannel(channel);
    };
  }, [supabase, channelId, markRead]);

  // Desce até o fim quando chega mensagem (se a pessoa já estava lá embaixo)
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  async function send(text: string, retryId?: string) {
    const body = text.trim();
    if (!body) return;
    if (body.length > 4000) {
      setError("Mensagem muito longa (máx. 4.000 caracteres).");
      return;
    }
    setError(null);
    const id = retryId ?? crypto.randomUUID();
    const optimistic: Pending = {
      id, channel_id: channelId, author_id: me.id, author_name: me.name, kind: "usuario", body,
      edited_at: null, deleted_at: null, created_at: new Date().toISOString(),
    };
    nearBottom.current = true;
    setMessages((list) => upsertMessage(list, optimistic));
    const { error: err } = await supabase.from("chat_messages").insert({ id, channel_id: channelId, body });
    if (err) {
      setMessages((list) => list.map((m) => (m.id === id ? { ...m, failed: true } : m)));
      setError("Não foi possível enviar. Toque na mensagem para tentar de novo.");
      return;
    }
    if (assistant === "auto" || (assistant === "mention" && mentionsAssistant(body))) {
      setThinking(true);
      try {
        const res = await askAssistant(channelId, id);
        if (res?.message) setMessages((list) => upsertMessage(list, res.message!));
        if (res?.error) setError(res.error);
      } catch {
        setError("O assistente não conseguiu responder agora.");
      } finally {
        setThinking(false);
      }
    }
  }

  async function remove(id: string) {
    const now = new Date().toISOString();
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, deleted_at: now } : m)));
    await supabase.from("chat_messages").update({ deleted_at: now }).eq("id", id);
  }

  function submit() {
    const text = draft;
    setDraft("");
    void send(text);
    input.current?.focus();
  }

  const groups = groupMessages(messages);

  return (
    <section className="widget flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Conversa">
      <header className="flex items-center gap-3 border-b border-border p-3">{header}</header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-5"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && assistant === "auto" && (
          <div className="m-auto max-w-sm text-center text-sm text-muted">
            <p className="mb-2 text-4xl"><Icon3D e="🤖" /></p>
            Pergunte sobre projetos, prazos, posts aguardando aprovação ou suas demandas. Eu respondo com o que está no sistema e na base de conhecimento.
          </div>
        )}
        {messages.length === 0 && assistant !== "auto" && (
          <div className="m-auto max-w-xs text-center text-sm text-muted">
            <p className="mb-2 text-4xl"><Icon3D e="👋" /></p>
            Nenhuma mensagem ainda. Comece a conversa.
          </div>
        )}
        {groups.map((g) => (
          <div key={g.day} className="flex flex-col">
            <p className="sticky top-0 z-10 mx-auto my-3 rounded-full bg-tile px-3 py-1 text-[11px] font-semibold text-muted">{dayLabel(g.day, today)}</p>
            {g.items.map((m) => {
              const mine = m.author_id === me.id && m.kind === "usuario";
              const bot = m.kind === "assistente";
              const failed = (m as Pending).failed;
              const name = bot ? "Assistente Bunker" : m.author_name || "Usuário";
              return (
                <div key={m.id} className={cx("group flex gap-2", mine ? "flex-row-reverse" : "", m.first ? "mt-3" : "mt-0.5")}>
                  {!mine && (
                    <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", m.first ? "" : "invisible", bot ? "bg-tint-purple text-violet" : "bg-tint-blue text-primary")} aria-hidden>
                      {bot ? <Icon3D e="🤖" /> : initialsOf(name)}
                    </span>
                  )}
                  <div className={cx("flex max-w-[min(36rem,85%)] flex-col", mine ? "items-end" : "items-start")}>
                    {m.first && !mine && <p className="mb-0.5 px-1 text-xs font-semibold text-muted">{name}</p>}
                    {m.deleted_at ? (
                      <p className="rounded-[1.25rem] border border-dashed border-border px-3.5 py-2 text-sm italic text-muted">Mensagem apagada</p>
                    ) : (
                      <button
                        type="button"
                        disabled={!failed}
                        onClick={() => failed && void send(m.body, m.id)}
                        className={cx(
                          "whitespace-pre-wrap rounded-[1.25rem] px-3.5 py-2 text-left text-[15px] leading-snug [overflow-wrap:anywhere] disabled:cursor-text",
                          mine ? "bg-gradient-to-b from-[#5574ff] to-[#2e4ff0] text-white" : bot ? "bg-tint-purple" : "bg-tile",
                          mine && m.first && "rounded-tr-md",
                          !mine && m.first && "rounded-tl-md",
                          failed && "opacity-60 ring-2 ring-accent",
                        )}
                      >
                        <Body text={m.body} />
                      </button>
                    )}
                    <p className="mt-0.5 flex items-center gap-2 px-1 text-[10px] text-muted">
                      {failed ? <span className="font-semibold text-accent">Falhou · toque para reenviar</span> : timeOf(m.created_at)}
                      {mine && !m.deleted_at && !failed && (
                        <button type="button" onClick={() => void remove(m.id)} className="opacity-0 transition hover:text-accent focus:opacity-100 group-hover:opacity-100">
                          apagar
                        </button>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {thinking && (
          <div className="mt-3 flex items-center gap-2" role="status">
            <span className="grid size-8 place-items-center rounded-full bg-tint-purple text-sm" aria-hidden><Icon3D e="🤖" /></span>
            <p className="rounded-[1.25rem] rounded-tl-md bg-tint-purple px-3.5 py-2 text-sm text-violet">
              <span className="inline-flex gap-1" aria-label="Assistente digitando">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
              </span>
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-border p-3"
      >
        <textarea
          ref={input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={Math.min(6, Math.max(1, draft.split("\n").length))}
          placeholder={placeholder}
          aria-label="Escreva uma mensagem"
          className="field h-auto min-h-12 flex-1 resize-none py-3"
        />
        <button disabled={!draft.trim()} aria-label="Enviar" className="btn btn-primary size-12 shrink-0 p-0 text-lg">➤</button>
      </form>
      {error ? (
        <p role="alert" className="px-4 pb-3 text-sm font-medium text-accent">{error}</p>
      ) : assistant === "mention" ? (
        <p className="hidden px-4 pb-3 text-xs text-muted sm:block">Dica: escreva <b>@assistente</b> na mensagem para o 🤖 responder.</p>
      ) : null}
    </section>
  );
}

export function ThreadHeader({ icon, tint, title, subtitle, href, hrefLabel }: { icon: string; tint: string; title: string; subtitle?: string | null; href?: string; hrefLabel?: string }) {
  return (
    <>
      <Link href="/bunker-chat" aria-label="Voltar às conversas" className="tile size-11 text-lg lg:hidden">←</Link>
      <span className={cx("tile size-10 shrink-0 text-lg", tint)}><Icon3D e={icon} /></span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold">{title}</h2>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} aria-label={hrefLabel ?? "Abrir projeto"} className="btn btn-soft h-10 shrink-0 px-3 text-sm sm:px-4">
          <span aria-hidden className="sm:hidden"><Icon3D e={hrefLabel ? "🧠" : "🛰️"} /></span><span className="hidden sm:inline">{hrefLabel ?? "Abrir projeto"}</span>
        </Link>
      )}
    </>
  );
}
