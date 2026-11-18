"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { GrandFormState } from "@/app/(sistema)/go-grand/actions";
import { CATEGORIES, type Kind } from "@/lib/go-grand/categories";

type Action = (s: GrandFormState, f: FormData) => Promise<GrandFormState>;
const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";

function KindToggle({ kind, onChange }: { kind: Kind; onChange: (k: Kind) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-[var(--radius-tile)] bg-tile p-1">
      {(["entrada", "saida"] as const).map((k) => (
        <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => onChange(k)}
          className={`h-10 rounded-[0.875rem] text-sm font-semibold transition ${kind === k ? "bg-white shadow-sm" : "text-muted"}`}>
          {k === "entrada" ? "↓ Entrada" : "↑ Saída"}
        </button>
      ))}
    </div>
  );
}

function CategorySelect({ kind }: { kind: Kind }) {
  return (
    <select name="category" required defaultValue="" className="field" key={kind}>
      <option value="" disabled>Escolha a categoria</option>
      {CATEGORIES.filter((c) => c.kind === kind).map((c) => (
        <option key={c.id} value={c.id}>{c.icon} {c.label}{c.operational ? "" : " (não operacional)"}</option>
      ))}
    </select>
  );
}

function Feedback({ state }: { state: GrandFormState }) {
  if (!state) return null;
  return state.error
    ? <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>
    : <p role="status" className="text-sm font-medium text-[#3c8a2e]">{state.ok}</p>;
}

function useResetOnOk(state: GrandFormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function TransactionForm({ action, defaultDate }: { action: Action; defaultDate: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [kind, setKind] = useState<Kind>("entrada");
  const ref = useResetOnOk(state);

  return (
    <form ref={ref} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="sm:col-span-2"><KindToggle kind={kind} onChange={setKind} /></div>
      <label className="flex flex-col gap-1.5"><span className={caption}>Categoria</span><CategorySelect kind={kind} /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Valor (R$)</span>
        <input name="amount" required inputMode="decimal" placeholder="0,00" className="field" /></label>
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Descrição</span>
        <input name="description" required placeholder={kind === "entrada" ? "Ex.: venda de notebook para a Clínica Sorriso" : "Ex.: Adobe Creative Cloud"} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Vencimento</span>
        <input name="due_date" type="date" required defaultValue={defaultDate} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Forma de pagamento</span>
        <input name="payment_method" placeholder="Pix, cartão, boleto..." className="field" /></label>
      <label className="flex cursor-pointer items-center gap-3 px-1 sm:col-span-2">
        <input type="checkbox" name="paid" value="1" defaultChecked className="size-5 accent-[var(--primary)]" />
        <span className="text-sm font-medium">{kind === "entrada" ? "Já recebido" : "Já pago"}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Salvar lançamento"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RecurringForm({ action, defaultDate }: { action: Action; defaultDate: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [kind, setKind] = useState<Kind>("saida");
  const ref = useResetOnOk(state);

  return (
    <form ref={ref} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="sm:col-span-2"><KindToggle kind={kind} onChange={setKind} /></div>
      <label className="flex flex-col gap-1.5"><span className={caption}>Categoria</span><CategorySelect kind={kind} /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Valor mensal (R$)</span>
        <input name="amount" required inputMode="decimal" placeholder="0,00" className="field" /></label>
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Descrição</span>
        <input name="description" required placeholder={kind === "saida" ? "Ex.: ChatGPT Plus" : "Ex.: manutenção de site"} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Dia do vencimento</span>
        <input name="day_of_month" type="number" min={1} max={31} required defaultValue={10} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Começa em</span>
        <input name="start_date" type="date" required defaultValue={defaultDate} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Termina em (opcional)</span>
        <input name="end_date" type="date" className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Observações</span>
        <input name="notes" className="field" /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Criar recorrência"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
