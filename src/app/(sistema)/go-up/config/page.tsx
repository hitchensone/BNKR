import Link from "next/link";
import { NewColumnForm, NewTemplateForm, TemplateItemForm, TintSelect } from "@/components/go-up/forms";
import { Bridge, Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireAdmin } from "@/lib/data/session";
import { listColumns, listTemplates } from "@/lib/data/work";
import { editColumn, removeColumn, removeTemplate, removeTemplateItem, shiftColumn } from "../actions";

export default async function WorkflowConfigPage() {
  await requireAdmin();
  const [columns, templates] = await Promise.all([listColumns(), listTemplates()]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Widget className="flex items-center gap-4 p-3">
        <Link href="/go-up" aria-label="Voltar ao GO UP" className="tile size-12 text-lg">←</Link>
        <Tile tint="blue" size="lg">⚙️</Tile>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fluxo e modelos</h1>
          <p className="text-sm text-muted">Como as demandas andam e o que se repete em todo projeto</p>
        </div>
      </Widget>

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="orange" size="md">🧭</Tile>
          <div>
            <h2 className="text-lg font-bold">Colunas do fluxo</h2>
            <p className="text-sm text-muted">Valem para todos os projetos. Colunas de &quot;concluído&quot; fecham a demanda.</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget flex flex-col gap-3 p-4">
          <ol className="flex flex-col gap-2">
            {columns.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-[1.5rem] bg-tile/50 p-2">
                <div className="flex flex-col">
                  <form action={shiftColumn}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} aria-label={`Subir ${c.name}`} className="px-2 text-xs text-muted disabled:opacity-30">▲</button></form>
                  <form action={shiftColumn}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="dir" value="down" />
                    <button disabled={i === columns.length - 1} aria-label={`Descer ${c.name}`} className="px-2 text-xs text-muted disabled:opacity-30">▼</button></form>
                </div>
                <form action={editColumn} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} aria-label="Nome da coluna" className="field min-w-40 flex-1 bg-white" />
                  <TintSelect defaultValue={c.tint} />
                  <label className="flex items-center gap-2 px-1 text-sm">
                    <input type="checkbox" name="is_done" value="1" defaultChecked={c.is_done} className="size-4 accent-[var(--primary)]" />Concluído
                  </label>
                  <button className="btn btn-soft h-10 bg-white px-3 text-xs">Salvar</button>
                </form>
                {columns.length > 1 && (
                  <form action={removeColumn} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={c.id} />
                    <select name="move_to" aria-label={`Levar as demandas de ${c.name} para`} defaultValue={columns.find((x) => x.id !== c.id)?.id}
                      className="h-10 rounded-xl bg-white px-2 text-xs outline-none">
                      {columns.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>Mover p/ {x.name}</option>)}
                    </select>
                    <button className="btn h-10 px-3 text-xs text-accent hover:bg-tint-red">Excluir</button>
                  </form>
                )}
              </li>
            ))}
          </ol>
          <NewColumnForm />
        </div>
      </WidgetGroup>

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="purple" size="md">⚡</Tile>
          <div>
            <h2 className="text-lg font-bold">Modelos de projeto</h2>
            <p className="text-sm text-muted">Etapas e demandas criadas num clique, com prazos contados a partir do início.</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget flex flex-col gap-4 p-4">
          {templates.map((t) => {
            const stagesT = t.items.filter((i) => i.kind === "etapa");
            return (
              <details key={t.id} className="rounded-[1.5rem] bg-tile/50 p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-semibold">
                  {t.name}
                  <span className="pill bg-white text-muted">{stagesT.length} etapas · {t.items.length - stagesT.length} demandas</span>
                </summary>
                {t.description && <p className="mt-1 text-sm text-muted">{t.description}</p>}
                <ul className="mt-3 flex flex-col gap-1">
                  {t.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                      <span className={`pill h-6 px-2 text-[11px] ${it.kind === "etapa" ? "bg-tint-blue text-primary" : "bg-tile text-muted"}`}>{it.kind === "etapa" ? "Etapa" : "Demanda"}</span>
                      <span className="min-w-0 flex-1 truncate">{it.title}{it.stage_title ? <span className="text-muted"> · {it.stage_title}</span> : null}</span>
                      <span className="text-xs text-muted">dia {it.offset_days}</span>
                      <form action={removeTemplateItem}><input type="hidden" name="id" value={it.id} />
                        <button aria-label={`Remover ${it.title}`} className="px-1 text-xs text-muted hover:text-accent">✕</button></form>
                    </li>
                  ))}
                </ul>
                <div className="mt-3"><TemplateItemForm templateId={t.id} stageTitles={stagesT.map((s) => s.title)} /></div>
                <form action={removeTemplate} className="mt-3">
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-xs font-semibold text-accent hover:underline">Excluir modelo</button>
                </form>
              </details>
            );
          })}
          <NewTemplateForm />
        </div>
      </WidgetGroup>
    </div>
  );
}
