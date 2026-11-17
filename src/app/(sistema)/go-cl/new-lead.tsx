"use client";

import { useActionState } from "react";
import { Bridge, Tile } from "@/components/ui";
import { addLead } from "./actions";

export function NewLeadForm({ action = addLead }: { action?: typeof addLead }) {
  const [error, formAction, pending] = useActionState(action, null);

  return (
    <details className="group widget-group max-w-5xl">
      <summary className="widget flex cursor-pointer list-none items-center gap-4 p-3 [&::-webkit-details-marker]:hidden">
        <Tile tint="blue" size="md">➕</Tile>
        <span className="flex-1 text-lg font-bold">Novo lead</span>
        <span className="btn btn-primary group-open:hidden">Adicionar</span>
        <span className="btn btn-soft hidden group-open:inline-flex">Fechar</span>
      </summary>
      <Bridge align="start" offset="3.5rem" />
      <form action={formAction} className="widget grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <input name="company_name" required placeholder="Empresa *" className="field" />
        <input name="contact_name" placeholder="Contato" className="field" />
        <input name="phone" placeholder="WhatsApp" inputMode="tel" className="field" />
        <input name="instagram" placeholder="@instagram" className="field" />
        <input name="segment" placeholder="Segmento" className="field" />
        <input name="city" placeholder="Cidade" className="field" />
        <input name="source" placeholder="Origem" className="field" />
        <input name="estimated_value" inputMode="decimal" placeholder="Potencial mensal (R$)" className="field" />
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Salvar lead"}</button>
          {error && <p className="text-sm font-medium text-accent">{error}</p>}
        </div>
      </form>
    </details>
  );
}
