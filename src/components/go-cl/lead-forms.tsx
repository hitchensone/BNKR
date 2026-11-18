"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Lead } from "@/lib/types";
import type { FormState } from "@/app/(sistema)/go-cl/[id]/actions";
import { CHANNEL, toLocalInput } from "./labels";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>
  ) : (
    <p role="status" className="text-sm font-medium text-[#3c8a2e]">{state.ok}</p>
  );
}

function Label({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>{children}</label>;
}
const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";

export function LeadInfoForm({ lead, action }: { lead: Lead; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={lead.id} />
      <Label wide><span className={caption}>Empresa</span>
        <input name="company_name" required defaultValue={lead.company_name} className="field" /></Label>
      <Label><span className={caption}>Contato</span>
        <input name="contact_name" defaultValue={lead.contact_name ?? ""} className="field" /></Label>
      <Label><span className={caption}>Cargo</span>
        <input name="contact_role" defaultValue={lead.contact_role ?? ""} className="field" /></Label>
      <Label><span className={caption}>WhatsApp</span>
        <input name="phone" inputMode="tel" defaultValue={lead.phone ?? ""} placeholder="(62) 99999-0000" className="field" /></Label>
      <Label><span className={caption}>Instagram</span>
        <input name="instagram" defaultValue={lead.instagram ? `@${lead.instagram.replace(/^@/, "")}` : ""} placeholder="@perfil" className="field" /></Label>
      <Label><span className={caption}>E-mail</span>
        <input name="email" type="email" defaultValue={lead.email ?? ""} className="field" /></Label>
      <Label><span className={caption}>Site</span>
        <input name="website" defaultValue={lead.website ?? ""} className="field" /></Label>
      <Label><span className={caption}>Segmento</span>
        <input name="segment" defaultValue={lead.segment ?? ""} className="field" /></Label>
      <Label><span className={caption}>Cidade</span>
        <input name="city" defaultValue={lead.city ?? ""} className="field" /></Label>
      <Label><span className={caption}>Origem</span>
        <input name="source" defaultValue={lead.source ?? ""} placeholder="Indicação, Instagram..." className="field" /></Label>
      <Label><span className={caption}>Potencial mensal (R$)</span>
        <input name="estimated_value" inputMode="decimal" defaultValue={lead.estimated_value?.toString().replace(".", ",") ?? ""} className="field" /></Label>
      <Label wide><span className={caption}>Temperatura</span>
        <div className="grid grid-cols-3 gap-2">
          {(["frio", "morno", "quente"] as const).map((t) => (
            <label key={t} className="cursor-pointer">
              <input type="radio" name="temperature" value={t} defaultChecked={lead.temperature === t} className="peer sr-only" />
              <span className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-tile)] bg-tile text-sm font-semibold transition peer-checked:bg-white peer-checked:shadow-[0_0_0_2px_var(--primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
                {t === "frio" ? "❄️ Frio" : t === "morno" ? "🌤️ Morno" : "🔥 Quente"}
              </span>
            </label>
          ))}
        </div>
      </Label>
      <Label><span className={caption}>Próxima ação</span>
        <input name="next_action" defaultValue={lead.next_action ?? ""} placeholder="Ligar para apresentar portfólio" className="field" /></Label>
      <Label><span className={caption}>Quando</span>
        <input name="next_action_at" type="datetime-local" defaultValue={toLocalInput(lead.next_action_at)} className="field" /></Label>
      <Label wide><span className={caption}>Observações</span>
        <textarea name="notes" rows={4} defaultValue={lead.notes ?? ""} className="field h-auto py-3" /></Label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Salvar dados"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function InteractionForm({ leadId, action }: { leadId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="lead_id" value={leadId} />
      <div className="flex gap-2">
        <select name="channel" defaultValue="whatsapp" aria-label="Canal" className="field w-auto flex-1 text-sm">
          {Object.entries(CHANNEL).map(([id, c]) => <option key={id} value={id}>{c.icon} {c.label}</option>)}
        </select>
        <select name="direction" defaultValue="saida" aria-label="Quem iniciou" className="field w-auto flex-1 text-sm">
          <option value="saida">Eu contatei</option>
          <option value="entrada">O lead contatou</option>
        </select>
      </div>
      <textarea name="summary" rows={2} required placeholder="O que foi conversado?" className="field h-auto py-3 text-sm" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary h-10 px-4 text-sm">{pending ? "Salvando..." : "Registrar contato"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
