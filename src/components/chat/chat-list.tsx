"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { listTime, type ChatSummary } from "@/lib/chat/helpers";
import { createClient } from "@/lib/supabase/client";
import { cx } from "../ui";

/**
 * Lista de conversas. Escuta mensagens novas de todas as conversas que a
 * pessoa acessa (o RLS filtra) e atualiza contadores sem recarregar a página.
 */
export function ChatList({
  chats,
  today,
  isStaff,
  actions,
}: {
  chats: ChatSummary[];
  today: string;
  isStaff: boolean;
  actions?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const activeId = pathname.startsWith("/bunker-chat/") ? pathname.split("/")[2] : null;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chat-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 500);
      })
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => chats.filter((c) => !q || `${c.title} ${c.subtitle ?? ""}`.toLowerCase().includes(q)),
    [chats, q],
  );
  const team = filtered.filter((c) => c.kind !== "projeto");
  const clients = filtered.filter((c) => c.kind === "projeto" && !c.archived);
  const archived = filtered.filter((c) => c.kind === "projeto" && c.archived);

  const row = (c: ChatSummary) => {
    const active = c.id === activeId;
    const unread = active ? 0 : c.unread;
    return (
      <li key={c.id}>
        <Link
          href={`/bunker-chat/${c.id}`}
          aria-current={active ? "page" : undefined}
          className={cx("flex items-center gap-3 rounded-[1.5rem] p-2 pr-3 transition", active ? "bg-tint-blue" : "hover:bg-tile/70")}
        >
          <span className={cx("tile size-11 shrink-0 text-lg", c.kind === "canal" && "font-bold text-primary", c.kind === "projeto" ? "bg-tint-purple" : c.kind === "direto" ? "bg-tint-green" : "bg-tint-blue")}>
            {c.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className={cx("truncate", unread ? "font-bold" : "font-semibold")}>{c.title}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted">{listTime(c.last_message_at, today)}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className={cx("truncate text-xs", unread ? "font-medium text-foreground" : "text-muted")}>
                {c.last_body ? `${c.last_author ? `${c.last_author.split(" ")[0]}: ` : ""}${c.last_body}` : c.subtitle}
              </span>
              {unread > 0 && (
                <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white" aria-label={`${unread} não lidas`}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </span>
          </span>
        </Link>
      </li>
    );
  };

  const section = (title: string, items: ChatSummary[], empty?: string) => (
    <section className="flex flex-col gap-1">
      <h2 className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {items.length ? <ul className="flex flex-col gap-0.5">{items.map(row)}</ul> : empty && <p className="px-3 py-2 text-sm text-muted">{empty}</p>}
    </section>
  );

  return (
    <aside className={cx("widget flex min-h-0 min-w-0 flex-1 flex-col p-2 lg:w-[22rem] lg:flex-none", activeId ? "hidden lg:flex" : "flex")} aria-label="Conversas">
      <div className="flex items-center gap-2 p-2">
        <span className="tile size-11 bg-tint-green text-xl">💬</span>
        <h1 className="flex-1 text-xl font-bold tracking-tight">Bunker Chat</h1>
        {actions}
      </div>
      <div className="px-2 pb-1">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar conversa"
        aria-label="Buscar conversa"
        className="field h-11"
      />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2">
        {isStaff ? (
          <>
            {section("Equipe", team, q ? undefined : "Nenhuma conversa da equipe.")}
            {section("Clientes", clients, q ? undefined : "As conversas aparecem quando um projeto é criado.")}
            {archived.length > 0 && (
              <div className="px-1">
                <button type="button" onClick={() => setShowArchived((v) => !v)} className="px-2 py-1 text-xs font-semibold text-muted hover:text-primary">
                  {showArchived ? "▾" : "▸"} Projetos encerrados ({archived.length})
                </button>
                {showArchived && <ul className="flex flex-col gap-0.5">{archived.map(row)}</ul>}
              </div>
            )}
          </>
        ) : (
          section("Seus projetos", [...clients, ...archived], "Nenhum projeto com conversa ainda.")
        )}
        {q && filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted">Nada encontrado para “{query}”.</p>}
      </div>
    </aside>
  );
}
