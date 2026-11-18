"use client";

import { useActionState, useState } from "react";
import type { BillingType, Contract } from "@/lib/types";
import type { ContractFormState } from "@/app/(sistema)/go-cl/contratos/actions";
import { Bridge, Tile, WidgetGroup } from "../ui";

type Action = (state: ContractFormState, formData: FormData) => Promise<ContractFormState>;
export type ContractDraft = Pick<
  Contract,
  | "title" | "party_name" | "party_document" | "party_address" | "party_representative"
  | "billing_type" | "monthly_value" | "one_time_value" | "payment_day" | "start_date"
  | "duration_months" | "scope" | "extra_clauses"
>;

const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";
const money = (v: number | null) => (v == null ? "" : v.toFixed(2).replace(".", ","));

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className={caption}>{label}</span>
      {children}
    </label>
  );
}

export function ContractForm({
  draft,
  action,
  contractId,
  leadId,
  briefingId,
}: {
  draft: ContractDraft;
  action: Action;
  contractId?: string;
  leadId?: string;
  briefingId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [billing, setBilling] = useState<BillingType>(draft.billing_type);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {contractId && <input type="hidden" name="id" value={contractId} />}
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      {briefingId && <input type="hidden" name="briefing_id" value={briefingId} />}
      <input type="hidden" name="billing_type" value={billing} />

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="blue" size="md">🏢</Tile>
          <div>
            <h2 className="text-lg font-bold">Contratante</h2>
            <p className="text-sm text-muted">Dados que aparecem no contrato. Confira com o cliente.</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <Field label="Título do contrato" wide>
            <input name="title" required defaultValue={draft.title} className="field" />
          </Field>
          <Field label="Razão social ou nome">
            <input name="party_name" required defaultValue={draft.party_name} className="field" />
          </Field>
          <Field label="CNPJ ou CPF">
            <input name="party_document" defaultValue={draft.party_document ?? ""} placeholder="00.000.000/0001-00" className="field" />
          </Field>
          <Field label="Endereço" wide>
            <input name="party_address" defaultValue={draft.party_address ?? ""} placeholder="Rua, número, bairro, cidade/UF" className="field" />
          </Field>
          <Field label="Representante que assina">
            <input name="party_representative" defaultValue={draft.party_representative ?? ""} className="field" />
          </Field>
        </div>
      </WidgetGroup>

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="green" size="md">💵</Tile>
          <div>
            <h2 className="text-lg font-bold">Valores e vigência</h2>
            <p className="text-sm text-muted">Ao assinar, os valores são lançados no financeiro.</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={caption}>Cobrança</span>
            <div role="radiogroup" aria-label="Tipo de cobrança" className="grid grid-cols-3 gap-1 rounded-[var(--radius-tile)] bg-tile p-1">
              {([["mensal", "Mensal"], ["unico", "Valor único"], ["misto", "Mensal + único"]] as const).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={billing === id} onClick={() => setBilling(id)}
                  className={`h-10 rounded-[0.875rem] text-sm font-semibold transition ${billing === id ? "bg-raised shadow-sm" : "text-muted"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {billing !== "unico" && (
            <Field label="Valor mensal (R$)">
              <input name="monthly_value" inputMode="decimal" defaultValue={money(draft.monthly_value)} placeholder="0,00" className="field" />
            </Field>
          )}
          {billing !== "mensal" && (
            <Field label="Valor único (R$)">
              <input name="one_time_value" inputMode="decimal" defaultValue={money(draft.one_time_value)} placeholder="0,00" className="field" />
            </Field>
          )}
          <Field label="Dia do pagamento">
            <input name="payment_day" type="number" min={1} max={31} defaultValue={draft.payment_day ?? ""} className="field" />
          </Field>
          <Field label="Início">
            <input name="start_date" type="date" defaultValue={draft.start_date ?? ""} className="field" />
          </Field>
          <Field label="Duração (meses)">
            <input name="duration_months" type="number" min={1} max={120} defaultValue={draft.duration_months ?? ""} className="field" />
          </Field>
        </div>
      </WidgetGroup>

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="purple" size="md">📄</Tile>
          <div>
            <h2 className="text-lg font-bold">Escopo e cláusulas</h2>
            <p className="text-sm text-muted">O escopo veio do briefing. Ajuste o texto se precisar.</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget flex flex-col gap-3 p-5">
          <Field label="Escopo (cláusula de objeto)">
            <textarea name="scope" required rows={7} defaultValue={draft.scope ?? ""} className="field h-auto py-3 font-medium" />
          </Field>
          <Field label="Cláusulas extras (opcional)">
            <textarea name="extra_clauses" rows={3} defaultValue={draft.extra_clauses ?? ""}
              placeholder="Ex.: ## CLÁUSULA EXTRA · EXCLUSIVIDADE&#10;Texto da cláusula." className="field h-auto py-3" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={pending} className="btn btn-primary">
              {pending ? "Salvando..." : contractId ? "Salvar alterações" : "Gerar contrato"}
            </button>
            {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
          </div>
        </div>
      </WidgetGroup>
    </form>
  );
}
