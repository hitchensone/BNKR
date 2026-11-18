"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createChannelAction, openDirectAction } from "@/app/(sistema)/bunker-chat/actions";

/** Botão "+" da lista: abre conversa direta ou cria um canal. */
export function NewChat({ staff }: { staff: { user_id: string; full_name: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [dmState, dmAction, dmPending] = useActionState(openDirectAction, null);
  const [chState, chAction, chPending] = useActionState(createChannelAction, null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Nova conversa" className="btn btn-primary size-10 p-0 text-lg">+</button>
      {open && (
        <div className="widget absolute right-0 top-12 z-30 flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-4 p-4 shadow-[0_24px_60px_-20px_rgb(42_55_104/0.45)]">
          <form action={dmAction} className="flex flex-col gap-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Conversa direta</p>
            {staff.length ? (
              <>
                <select name="user_id" required className="field" defaultValue="">
                  <option value="" disabled>Escolha alguém da equipe</option>
                  {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name || "Sem nome"}</option>)}
                </select>
                <button disabled={dmPending} className="btn btn-soft h-10 text-sm">{dmPending ? "Abrindo..." : "Abrir conversa"}</button>
              </>
            ) : (
              <p className="px-1 text-sm text-muted">Ainda não há mais ninguém na equipe. Convide em GO UP › Equipe.</p>
            )}
            {dmState?.error && <p role="alert" className="text-sm text-accent">{dmState.error}</p>}
          </form>
          <div className="h-px bg-border" />
          <form action={chAction} className="flex flex-col gap-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Novo canal da equipe</p>
            <input name="name" required placeholder="ex.: criação" className="field" aria-label="Nome do canal" />
            <input name="description" placeholder="Sobre o que é (opcional)" className="field" aria-label="Descrição do canal" />
            <button disabled={chPending} className="btn btn-soft h-10 text-sm">{chPending ? "Criando..." : "Criar canal"}</button>
            {chState?.error && <p role="alert" className="text-sm text-accent">{chState.error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
