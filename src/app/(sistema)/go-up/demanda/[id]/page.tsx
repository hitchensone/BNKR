import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CommentForm, EditTaskForm, NewTaskForm } from "@/components/go-up/forms";
import { formatDateTime } from "@/components/go-cl/labels";
import { Bridge, Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff } from "@/lib/data/session";
import { getProject } from "@/lib/data/portal";
import { createClient } from "@/lib/supabase/server";
import { PRIORITY } from "@/lib/go-up/helpers";
import { getTask, getTaskDetails, listColumns, listStaff } from "@/lib/data/work";
import { moveTaskForm, removeTask } from "../../actions";

export default async function TaskPage({ params }: PageProps<"/go-up/demanda/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const task = await getTask(id);
  if (!task) notFound();

  const supabase = await createClient();
  const [project, columns, staff, details, { data: stages }, parent] = await Promise.all([
    getProject(task.project_id), listColumns(), listStaff(), getTaskDetails(id),
    supabase.from("project_stages").select("id, title").eq("project_id", task.project_id).order("position"),
    task.parent_id ? getTask(task.parent_id) : Promise.resolve(null),
  ]);
  const names = new Map(staff.map((s) => [s.user_id, s.full_name]));
  const doneCol = columns.find((c) => c.is_done);
  const firstCol = columns[0];
  const col = columns.find((c) => c.id === task.column_id);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <WidgetGroup row className="w-full">
        <Link href={parent ? `/go-up/demanda/${parent.id}` : `/go-up/${task.project_id}`} aria-label="Voltar" className="widget grid place-items-center p-3">
          <span className="tile size-12 text-lg">←</span>
        </Link>
        <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
        <div className="widget flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-3 pr-5">
          <Tile tint={col?.tint ?? "blue"} size="lg">{task.completed_at ? "✅" : "📌"}</Tile>
          <div className="min-w-40 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">
              {parent ? `Subtarefa de: ${parent.title}` : `${project?.client?.trade_name || project?.client?.name} · ${project?.name}`}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <p className="text-xs text-muted">
              Pedido por {task.requested_by ? names.get(task.requested_by) ?? "—" : "—"} · {formatDateTime(task.created_at)}
              {task.completed_at ? ` · concluída ${formatDateTime(task.completed_at)}` : ""}
            </p>
          </div>
          <span className={`pill ${PRIORITY[task.priority].cls}`}>{PRIORITY[task.priority].label}</span>
          {doneCol && (
            <form action={moveTaskForm}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="column_id" value={task.completed_at ? firstCol.id : doneCol.id} />
              <button className={`btn h-11 px-4 text-sm ${task.completed_at ? "btn-soft" : "btn-primary"}`}>
                {task.completed_at ? "Reabrir" : "✓ Concluir"}
              </button>
            </form>
          )}
        </div>
      </WidgetGroup>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <Widget className="p-5"><EditTaskForm task={task} columns={columns} staff={staff} stages={stages ?? []} /></Widget>

          {!task.parent_id && (
            <WidgetGroup>
              <div className="widget flex items-center gap-4 p-3">
                <Tile tint="green" size="md">☑</Tile>
                <div>
                  <h2 className="text-lg font-bold">Subtarefas</h2>
                  <p className="text-sm text-muted">{details.subtasks.filter((s) => s.completed_at).length} de {details.subtasks.length} concluídas</p>
                </div>
              </div>
              <Bridge align="start" offset="3.5rem" />
              <div className="widget flex flex-col gap-3 p-4">
                <ul className="flex flex-col gap-1">
                  {details.subtasks.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 rounded-[1.25rem] p-2 hover:bg-tile/50">
                      {doneCol && (
                        <form action={moveTaskForm}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="column_id" value={s.completed_at ? firstCol.id : doneCol.id} />
                          <button aria-label={s.completed_at ? `Reabrir ${s.title}` : `Concluir ${s.title}`}
                            className={`grid size-8 place-items-center rounded-full text-sm font-bold ${s.completed_at ? "bg-tint-green text-[#3c8a2e]" : "bg-tile text-muted hover:bg-tint-green"}`}>
                            {s.completed_at ? "✓" : ""}
                          </button>
                        </form>
                      )}
                      <Link href={`/go-up/demanda/${s.id}`} className={`min-w-0 flex-1 truncate font-medium hover:text-primary ${s.completed_at ? "text-muted line-through" : ""}`}>{s.title}</Link>
                      {s.assignee_id && <span className="text-xs text-muted">{names.get(s.assignee_id)}</span>}
                    </li>
                  ))}
                  {details.subtasks.length === 0 && <li className="px-1 text-sm text-muted">Divida a demanda em passos menores.</li>}
                </ul>
                <NewTaskForm projectId={task.project_id} columns={columns} staff={staff} stages={[]} parentId={task.id} defaultAssignee={task.assignee_id ?? undefined} />
              </div>
            </WidgetGroup>
          )}
        </div>

        <WidgetGroup className="h-fit">
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="orange" size="md">💬</Tile>
            <div>
              <h2 className="text-lg font-bold">Comentários</h2>
              <p className="text-sm text-muted">Só a equipe vê.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget flex flex-col gap-4 p-4">
            <ul className="flex flex-col gap-3">
              {details.comments.map((c) => (
                <li key={c.id} className="rounded-[1.25rem] bg-tile/50 p-3">
                  <p className="whitespace-pre-line text-sm">{c.body}</p>
                  <p className="mt-1 text-xs text-muted">{c.created_by ? names.get(c.created_by) ?? "—" : "—"} · {formatDateTime(c.created_at)}</p>
                </li>
              ))}
              {details.comments.length === 0 && <li className="px-1 text-sm text-muted">Nenhum comentário ainda.</li>}
            </ul>
            <CommentForm taskId={task.id} />
            <form action={removeTask} className="border-t border-border pt-3">
              <input type="hidden" name="id" value={task.id} />
              <button className="text-xs font-semibold text-accent hover:underline">Excluir esta demanda</button>
            </form>
          </div>
        </WidgetGroup>
      </div>
    </div>
  );
}
