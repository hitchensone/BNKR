"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveKnowledgeAction } from "@/app/(sistema)/bunker-chat/actions";
import type { Knowledge } from "@/lib/data/chat";

export function KnowledgeForm({ item }: { item?: Knowledge }) {
  const [state, action, pending] = useActionState(saveKnowledgeAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!item && state?.ok) ref.current?.reset();
  }, [state, item]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input name="title" required maxLength={120} defaultValue={item?.title} placeholder="Título (ex.: Planos de gestão de redes)" aria-label="Título" className="field bg-raised" />
      <textarea name="content" required rows={item ? 6 : 4} maxLength={8000} defaultValue={item?.content}
        placeholder="Escreva como explicaria para alguém novo: o que é, como funciona, prazos padrão, o que o cliente precisa enviar..."
        aria-label="Conteúdo" className="field h-auto bg-raised py-3" />
      <div className="flex flex-wrap items-center gap-3">
        <select name="audience" defaultValue={item?.audience ?? "equipe"} aria-label="Quem pode ver" className="field w-auto bg-raised">
          <option value="equipe">Só equipe</option>
          <option value="todos">Todos (inclui clientes)</option>
        </select>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="size-4 accent-[#3b5bf6]" /> Ativo
        </label>
        <button disabled={pending} className="btn btn-primary ml-auto h-10 px-5 text-sm">{pending ? "Salvando..." : item ? "Salvar" : "Adicionar"}</button>
      </div>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-ok">{state.ok}</p>}
    </form>
  );
}
