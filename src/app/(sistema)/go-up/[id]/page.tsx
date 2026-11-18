import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TaskBoard } from "@/components/go-up/board";
import { ApplyTemplateForm, NewTaskForm } from "@/components/go-up/forms";
import { Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff, todaySP } from "@/lib/data/session";
import { getProject } from "@/lib/data/portal";
import { createClient } from "@/lib/supabase/server";
import { listColumns, listProjectTasks, listStaff, listTemplates } from "@/lib/data/work";
import { Icon3D } from "@/components/icon3d";

export default async function ProjectBoardPage({ params }: PageProps<"/go-up/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const project = await getProject(id);
  if (!project) notFound();

  const supabase = await createClient();
  const [columns, tasks, staff, templates, today, { data: stages }] = await Promise.all([
    listColumns(), listProjectTasks(id), listStaff(), listTemplates(), todaySP(),
    supabase.from("project_stages").select("id, title").eq("project_id", id).order("position"),
  ]);

  const top = tasks.filter((t) => !t.parent_id);
  const subtaskCounts: Record<string, { done: number; total: number }> = {};
  for (const t of tasks.filter((t) => t.parent_id)) {
    const c = (subtaskCounts[t.parent_id!] ??= { done: 0, total: 0 });
    c.total++;
    if (t.completed_at) c.done++;
  }

  return (
    <div className="flex flex-col gap-6">
      <WidgetGroup row className="w-full">
        <Link href="/go-up" aria-label="Voltar aos projetos" className="widget grid place-items-center p-3">
          <span className="tile size-12 text-lg">←</span>
        </Link>
        <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
        <div className="widget flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-3 pr-4">
          <Tile tint="blue" size="lg">📁</Tile>
          <div className="min-w-40 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{project.client?.trade_name || project.client?.name}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{project.name}</h1>
          </div>
          <Link href={`/go-there/${id}`} className="btn btn-soft h-10 px-4 text-sm"><Icon3D e="🛰️" /> Ver no GO THERE</Link>
        </div>
      </WidgetGroup>

      {/* No celular o formulário fica recolhido para o quadro aparecer primeiro. */}
      <details className="widget p-4 sm:hidden">
        <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">＋ Nova demanda</summary>
        <div className="mt-3"><NewTaskForm projectId={id} columns={columns} staff={staff} stages={stages ?? []} /></div>
      </details>
      <Widget className="hidden flex-col gap-3 p-4 sm:flex">
        <NewTaskForm projectId={id} columns={columns} staff={staff} stages={stages ?? []} />
        {templates.length > 0 && (
          <details className="border-t border-border pt-3">
            <summary className="cursor-pointer px-1 text-sm font-semibold text-muted"><Icon3D e="⚡" /> Criar etapas e demandas a partir de um modelo</summary>
            <div className="mt-3"><ApplyTemplateForm projectId={id} templates={templates} today={today} /></div>
          </details>
        )}
      </Widget>

      <TaskBoard columns={columns} tasks={top} staff={staff} stages={stages ?? []} subtaskCounts={subtaskCounts} today={today} />
    </div>
  );
}
