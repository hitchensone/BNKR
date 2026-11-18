"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  applyProjectTemplate, newColumn, newComment, newStaff, newTask, newTemplate, newTemplateItem, saveTask, type UpState,
} from "@/app/(sistema)/go-up/actions";
import type { StaffMember, Task, TaskColumn, Template } from "@/lib/go-up/types";

const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";

function Feedback({ state }: { state: UpState }) {
  if (!state || state.password) return null;
  return state.error
    ? <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>
    : <p role="status" className="text-sm font-medium text-ok">{state.ok}</p>;
}

function useResetOnOk(state: UpState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

function StaffSelect({ staff, defaultValue, name = "assignee_id" }: { staff: StaffMember[]; defaultValue?: string | null; name?: string }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} aria-label="Responsável" className="field">
      <option value="">Sem responsável</option>
      {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name ?? "Sem nome"}</option>)}
    </select>
  );
}

function PrioritySelect({ defaultValue = "normal" }: { defaultValue?: string }) {
  return (
    <select name="priority" defaultValue={defaultValue} aria-label="Prioridade" className="field">
      <option value="baixa">Prioridade baixa</option>
      <option value="normal">Prioridade normal</option>
      <option value="alta">Prioridade alta</option>
      <option value="urgente">Urgente</option>
    </select>
  );
}

export function NewTaskForm({
  projectId,
  columns,
  staff,
  stages,
  parentId,
  defaultAssignee,
}: {
  projectId: string;
  columns: TaskColumn[];
  staff: StaffMember[];
  stages: { id: string; title: string }[];
  parentId?: string;
  defaultAssignee?: string;
}) {
  const [state, action, pending] = useActionState(newTask, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
      <input type="hidden" name="project_id" value={projectId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <input name="title" required placeholder={parentId ? "Nova subtarefa" : "Nova demanda (ex.: arte do post de Natal)"} aria-label="Título" className="field sm:col-span-2 lg:col-span-1" />
      <select name="column_id" defaultValue={columns[0]?.id} aria-label="Coluna" className="field">
        {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <StaffSelect staff={staff} defaultValue={defaultAssignee} />
      <input name="due_date" type="date" aria-label="Prazo" className="field" />
      {parentId ? <input type="hidden" name="stage_id" value="" /> : (
        <select name="stage_id" defaultValue="" aria-label="Etapa" className="field">
          <option value="">Sem etapa</option>
          {stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      )}
      {parentId ? <input type="hidden" name="priority" value="normal" /> : null}
      <button disabled={pending} className="btn btn-primary">{pending ? "..." : "＋ Criar"}</button>
      {!parentId && <div className="sm:col-span-2 lg:col-span-6"><PrioritySelectInline /></div>}
      <div className="sm:col-span-2 lg:col-span-6"><Feedback state={state} /></div>
    </form>
  );
}

/** Prioridade como chips (mais rápido que uma lista). */
function PrioritySelectInline() {
  return (
    <div role="radiogroup" aria-label="Prioridade" className="flex flex-wrap gap-1.5">
      {(["baixa", "normal", "alta", "urgente"] as const).map((p) => (
        <label key={p} className="cursor-pointer">
          <input type="radio" name="priority" value={p} defaultChecked={p === "normal"} className="peer sr-only" />
          <span className="pill bg-tile text-muted transition peer-checked:bg-raised peer-checked:text-foreground peer-checked:shadow-[0_0_0_2px_var(--primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
            {p === "baixa" ? "Baixa" : p === "normal" ? "Normal" : p === "alta" ? "Alta" : "🔥 Urgente"}
          </span>
        </label>
      ))}
    </div>
  );
}

export function ApplyTemplateForm({ projectId, templates, today }: { projectId: string; templates: Template[]; today: string }) {
  const [state, action, pending] = useActionState(applyProjectTemplate, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="project_id" value={projectId} />
      <select name="template_id" required defaultValue="" aria-label="Modelo" className="field w-auto min-w-48 flex-1">
        <option value="" disabled>Escolha um modelo</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <label className="flex items-center gap-2 text-sm text-muted">Início
        <input name="start" type="date" required defaultValue={today} className="field w-auto" />
      </label>
      <button disabled={pending || templates.length === 0} className="btn btn-soft">{pending ? "Aplicando..." : "Aplicar modelo"}</button>
      <Feedback state={state} />
    </form>
  );
}

export function EditTaskForm({
  task,
  columns,
  staff,
  stages,
}: {
  task: Task;
  columns: TaskColumn[];
  staff: StaffMember[];
  stages: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(saveTask, null);
  return (
    <form action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={task.id} />
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Título</span>
        <input name="title" required defaultValue={task.title} className="field" /></label>
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Descrição e briefing da demanda</span>
        <textarea name="description" rows={5} defaultValue={task.description ?? ""} placeholder="O que precisa ser feito, referências, formatos..." className="field h-auto py-3" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Coluna</span>
        <select name="column_id" defaultValue={task.column_id} className="field">
          {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Responsável</span>
        <StaffSelect staff={staff} defaultValue={task.assignee_id} /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Prazo</span>
        <input name="due_date" type="date" defaultValue={task.due_date ?? ""} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Prioridade</span>
        <PrioritySelect defaultValue={task.priority} /></label>
      {task.parent_id ? <input type="hidden" name="stage_id" value={task.stage_id ?? ""} /> : (
        <label className="flex flex-col gap-1.5"><span className={caption}>Etapa do projeto</span>
          <select name="stage_id" defaultValue={task.stage_id ?? ""} className="field">
            <option value="">Sem etapa</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select></label>
      )}
      <label className="flex cursor-pointer items-center gap-3 self-end px-1 pb-3">
        <input type="checkbox" name="visible_to_client" value="1" defaultChecked={task.visible_to_client} className="size-5 accent-[var(--primary)]" />
        <span className="text-sm font-medium">Cliente vê no GO THERE</span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Salvar demanda"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, action, pending] = useActionState(newComment, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="task_id" value={taskId} />
      <textarea name="body" required rows={2} placeholder="Comente, peça ajuste, marque um avanço..." aria-label="Comentário" className="field h-auto py-3" />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn btn-primary h-10 px-4 text-sm">Comentar</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function NewColumnForm() {
  const [state, action, pending] = useActionState(newColumn, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" required placeholder="Nova coluna (ex.: Captação)" aria-label="Nome da coluna" className="field min-w-48 flex-1" />
      <TintSelect />
      <label className="flex items-center gap-2 px-1 text-sm"><input type="checkbox" name="is_done" value="1" className="size-4 accent-[var(--primary)]" />Conta como concluído</label>
      <button disabled={pending} className="btn btn-primary">＋ Coluna</button>
      <Feedback state={state} />
    </form>
  );
}

export function TintSelect({ defaultValue = "blue" }: { defaultValue?: string }) {
  return (
    <select name="tint" defaultValue={defaultValue} aria-label="Cor" className="field w-auto">
      <option value="blue">🔵 Azul</option>
      <option value="orange">🟠 Laranja</option>
      <option value="purple">🟣 Roxo</option>
      <option value="yellow">🟡 Amarelo</option>
      <option value="green">🟢 Verde</option>
      <option value="red">🔴 Vermelho</option>
    </select>
  );
}

export function NewTemplateForm() {
  const [state, action, pending] = useActionState(newTemplate, null);
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" required placeholder="Nome do modelo (ex.: Lançamento de produto)" aria-label="Nome do modelo" className="field min-w-48 flex-1" />
      <input name="description" placeholder="Descrição (opcional)" aria-label="Descrição" className="field min-w-48 flex-1" />
      <button disabled={pending} className="btn btn-primary">＋ Modelo</button>
      <Feedback state={state} />
    </form>
  );
}

export function TemplateItemForm({ templateId, stageTitles }: { templateId: string; stageTitles: string[] }) {
  const [state, action, pending] = useActionState(newTemplateItem, null);
  const [kind, setKind] = useState<"etapa" | "tarefa">("tarefa");
  const ref = useResetOnOk(state);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="template_id" value={templateId} />
      <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as "etapa" | "tarefa")} aria-label="Tipo" className="field w-auto">
        <option value="etapa">Etapa</option>
        <option value="tarefa">Demanda</option>
      </select>
      <input name="title" required placeholder={kind === "etapa" ? "Nome da etapa" : "Nome da demanda"} aria-label="Nome" className="field min-w-40 flex-1" />
      {kind === "tarefa" && (
        <select name="stage_title" defaultValue="" aria-label="Etapa" className="field w-auto">
          <option value="">Sem etapa</option>
          {stageTitles.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <label className="flex items-center gap-2 text-sm text-muted">Prazo: dia
        <input name="offset_days" type="number" min={0} max={365} defaultValue={0} className="field w-20" />
      </label>
      <input type="hidden" name="priority" value="normal" />
      <button disabled={pending} className="btn btn-soft">＋ Item</button>
      <Feedback state={state} />
    </form>
  );
}

export function StaffForm() {
  const [state, action, pending] = useActionState(newStaff, null);
  const [copied, setCopied] = useState(false);
  const ref = useResetOnOk(state);
  return (
    <div className="flex flex-col gap-3">
      <form ref={ref} action={action} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <input name="full_name" required placeholder="Nome" aria-label="Nome" className="field" />
        <input name="email" type="email" required placeholder="E-mail" aria-label="E-mail" className="field" />
        <select name="role" defaultValue="team" aria-label="Papel" className="field w-auto">
          <option value="team">Equipe</option>
          <option value="admin">Admin (vê financeiro)</option>
        </select>
        <button disabled={pending} className="btn btn-primary">{pending ? "Criando..." : "Criar acesso"}</button>
      </form>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
      {state?.password && (
        <div role="status" className="rounded-[1.25rem] bg-tint-green p-4 text-sm">
          <p className="font-semibold">{state.ok}</p>
          <p className="mt-1">Senha temporária (aparece só agora):</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-raised px-3 py-1.5 font-mono text-base font-bold tracking-wider">{state.password}</code>
            <button type="button" className="btn btn-soft h-9 bg-raised px-3 text-xs"
              onClick={() => { void navigator.clipboard.writeText(state.password!); setCopied(true); }}>
              {copied ? "Copiada ✓" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
