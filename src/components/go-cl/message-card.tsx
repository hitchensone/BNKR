"use client";

import { useState, useTransition } from "react";
import type { ContactChannel } from "@/lib/types";
import { CHANNEL } from "./labels";
import { Tile } from "../ui";

export interface ReadyMessage {
  templateId: string;
  name: string;
  channel: ContactChannel;
  subject: string | null;
  text: string;
  /** Link que abre o app já com a mensagem (WhatsApp, e-mail, Instagram). */
  href: string | null;
  missing: string | null; // o que falta no cadastro para abrir direto
  recommended: boolean;
}

export function MessageCard({
  message,
  onUse,
}: {
  message: ReadyMessage;
  onUse: (templateId: string, channel: ContactChannel, name: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const ch = CHANNEL[message.channel];
  const hasBlank = message.text.includes("____");

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.subject ? `${message.subject}\n\n${message.text}` : message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* navegador sem permissão de área de transferência */
    }
  }

  function send() {
    // Instagram não aceita texto pronto no link: copia antes de abrir.
    if (message.channel === "instagram") void copy();
    if (message.href) window.open(message.href, "_blank", "noopener");
    start(() => onUse(message.templateId, message.channel, message.name));
  }

  return (
    <article className="rounded-[1.75rem] bg-tile/60 p-3">
      <header className="flex items-center gap-3">
        <Tile tint={ch.tint} size="sm">{ch.icon}</Tile>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{message.name}</h3>
          <p className="text-xs text-muted">{ch.label}</p>
        </div>
        {message.recommended && <span className="pill bg-tint-green text-ok">Etapa atual</span>}
      </header>

      <div className="mt-3 rounded-[1.25rem] bg-raised p-4 text-sm leading-relaxed shadow-[inset_0_2px_4px_rgb(42_55_104/0.04)]">
        {message.subject && <p className="mb-2 font-semibold">{message.subject}</p>}
        <p className="whitespace-pre-line">{message.text}</p>
      </div>

      {hasBlank && (
        <p className="mt-2 px-1 text-xs font-medium text-accent">Campos com ____ estão sem dado no cadastro do lead.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {message.href ? (
          <button type="button" onClick={send} disabled={pending} className="btn btn-primary h-10 px-4 text-sm">
            {message.channel === "whatsapp" && "Abrir no WhatsApp"}
            {message.channel === "email" && "Abrir no e-mail"}
            {message.channel === "instagram" && "Copiar e abrir Instagram"}
            {!["whatsapp", "email", "instagram"].includes(message.channel) && "Marcar como enviada"}
          </button>
        ) : (
          <span className="px-1 text-xs text-muted">{message.missing}</span>
        )}
        <button type="button" onClick={copy} className="btn btn-soft h-10 px-4 text-sm">
          {copied ? "Copiada ✓" : "Copiar"}
        </button>
        {!message.href && (
          <button type="button" onClick={send} disabled={pending} className="btn btn-soft h-10 px-4 text-sm">
            Marcar como enviada
          </button>
        )}
      </div>
    </article>
  );
}
