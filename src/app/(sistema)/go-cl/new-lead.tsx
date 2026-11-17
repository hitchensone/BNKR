"use client";

import { useActionState } from "react";
import { addLead } from "./actions";

const field = "rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function NewLeadForm() {
  const [error, action, pending] = useActionState(addLead, null);

  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer font-medium">Novo lead</summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="company_name" required placeholder="Empresa *" className={field} />
        <input name="contact_name" placeholder="Contato" className={field} />
        <input name="phone" placeholder="WhatsApp" className={field} />
        <input name="instagram" placeholder="@instagram" className={field} />
        <input name="segment" placeholder="Segmento" className={field} />
        <input name="city" placeholder="Cidade" className={field} />
        <input name="source" placeholder="Origem (indicação, Instagram...)" className={field} />
        <input name="estimated_value" inputMode="decimal" placeholder="Potencial mensal (R$)" className={field} />
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {pending ? "Salvando..." : "Adicionar"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </form>
    </details>
  );
}
