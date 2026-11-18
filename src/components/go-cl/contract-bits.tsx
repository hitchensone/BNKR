"use client";

import { useActionState } from "react";
import type { ContractStatus } from "@/lib/types";
import type { SignState } from "@/app/(sistema)/go-cl/contratos/actions";
import { Icon3D } from "@/components/icon3d";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-soft h-10 px-4 text-sm">
      <Icon3D e="🖨️" /> Imprimir ou salvar PDF
    </button>
  );
}

export function SignForm({
  contractId,
  defaultName,
  action,
}: {
  contractId: string;
  defaultName: string;
  action: (s: SignState, f: FormData) => Promise<SignState>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={contractId} />
      <label className="flex flex-col gap-1.5">
        <span className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">Assinado por</span>
        <input name="signed_by_name" required defaultValue={defaultName} className="field" />
      </label>
      <button disabled={pending} className="btn btn-primary">{pending ? "Registrando..." : "Registrar assinatura"}</button>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
      <p className="px-1 text-xs text-muted">Ao registrar, o sistema cria o cliente, o projeto inicial e lança os valores no financeiro.</p>
    </form>
  );
}

const STATUS: Record<ContractStatus, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-tint-yellow text-warn" },
  enviado: { label: "Enviado", cls: "bg-tint-blue text-primary" },
  assinado: { label: "Assinado", cls: "bg-tint-green text-ok" },
  cancelado: { label: "Cancelado", cls: "bg-tile text-muted" },
};

export function ContractStatusPill({ status }: { status: ContractStatus }) {
  const s = STATUS[status];
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}
