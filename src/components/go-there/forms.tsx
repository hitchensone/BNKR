"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  newClientAccess, newProject, newRequest, newStage, postUpdate, type PortalState,
} from "@/app/(sistema)/go-there/actions";

const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";

function Feedback({ state }: { state: PortalState }) {
  if (!state || state.password) return null;
  return state.error
    ? <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>
    : <p role="status" className="text-sm font-medium text-[#3c8a2e]">{state.ok}</p>;
}

function useResetOnOk(state: PortalState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

export function NewProjectForm({ clients }: { clients: { id: string; name: string; trade_name: string | null }[] }) {
  const [state, action, pending] = useActionState(newProject, null);
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5"><span className={caption}>Cliente</span>
        <select name="client_id" required defaultValue="" className="field">
          <option value="" disabled>Escolha o cliente</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.trade_name || c.name}</option>)}
        </select></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Nome do projeto</span>
        <input name="name" required placeholder="Ex.: Campanha de Natal" className="field" /></label>
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Descrição</span>
        <input name="description" placeholder="Resumo do que será entregue" className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Entrega prevista</span>
        <input name="ends_on" type="date" className="field" /></label>
      <div className="flex items-end gap-3">
        <button disabled={pending || clients.length === 0} className="btn btn-primary">{pending ? "Criando..." : "Criar projeto"}</button>
      </div>
      {clients.length === 0 && <p className="text-sm text-muted sm:col-span-2">Os clientes aparecem aqui depois do primeiro contrato assinado no GO CL.</p>}
      <div className="sm:col-span-2"><Feedback state={state} /></div>
    </form>
  );
}

export function StageForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(newStage, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="title" required placeholder="Nova etapa (ex.: Aprovação das artes)" aria-label="Nome da etapa" className="field min-w-48 flex-1" />
      <input name="due_date" type="date" aria-label="Prazo da etapa" className="field w-auto" />
      <button disabled={pending} className="btn btn-primary h-12 px-4 text-sm">＋ Etapa</button>
      <Feedback state={state} />
    </form>
  );
}

export function UpdateForm({ projectId }: { projectId: string }) {
  const [state, action, pending] = useActionState(postUpdate, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="project_id" value={projectId} />
      <textarea name="body" required rows={2} placeholder="Conte ao cliente o que avançou..." aria-label="Atualização" className="field h-auto py-3" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary h-10 px-4 text-sm">Publicar no mural</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RequestForm({ projectId, isStaff }: { projectId: string; isStaff: boolean }) {
  const [state, action, pending] = useActionState(newRequest, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="project_id" value={projectId} />
      <input name="title" required aria-label="O que precisa"
        placeholder={isStaff ? "O que o cliente precisa enviar? (ex.: logo em vetor)" : "O que você precisa da agência?"} className="field" />
      <div className="flex flex-wrap gap-2">
        <input name="description" aria-label="Detalhes" placeholder="Detalhes (opcional)" className="field min-w-48 flex-1" />
        <input name="due_date" type="date" aria-label="Prazo" className="field w-auto" />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary h-10 px-4 text-sm">{isStaff ? "Pedir ao cliente" : "Enviar pedido"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AccessForm({ projectId, clientId }: { projectId: string; clientId: string }) {
  const [state, action, pending] = useActionState(newClientAccess, null);
  const [copied, setCopied] = useState(false);
  const ref = useResetOnOk(state);

  return (
    <div className="flex flex-col gap-3">
      <form ref={ref} action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input type="hidden" name="project_id" value={projectId} />
        <input type="hidden" name="client_id" value={clientId} />
        <input name="full_name" required placeholder="Nome" aria-label="Nome da pessoa" className="field" />
        <input name="email" type="email" required placeholder="E-mail" aria-label="E-mail" className="field" />
        <button disabled={pending} className="btn btn-primary">{pending ? "Criando..." : "Criar acesso"}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
      {state?.password && (
        <div role="status" className="rounded-[1.25rem] bg-tint-green p-4 text-sm">
          <p className="font-semibold">{state.ok}</p>
          <p className="mt-1">Senha temporária (aparece só agora):</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-base font-bold tracking-wider">{state.password}</code>
            <button type="button" className="btn btn-soft h-9 bg-white px-3 text-xs"
              onClick={() => { void navigator.clipboard.writeText(state.password!); setCopied(true); }}>
              {copied ? "Copiada ✓" : "Copiar"}
            </button>
          </div>
          <p className="mt-2 text-xs">Envie ao cliente junto com o endereço do sistema. Ele pode trocar a senha em Minha conta.</p>
        </div>
      )}
    </div>
  );
}
