"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moveTask } from "@/app/(sistema)/go-up/actions";
import { PRIORITY, initials, shortDate, sortTasks } from "@/lib/go-up/helpers";
import type { StaffMember, Task, TaskColumn } from "@/lib/go-up/types";
import { cx } from "../ui";

// Cor forte da coluna (as tintas pastel ficam fracas num ponto pequeno).
const tintDot: Record<string, string> = {
  red: "#ff5a36", yellow: "#f5b400", green: "#3fbf5a", blue: "#3b5bf6", purple: "#8b5cf6", orange: "#ff7a3d",
};

/**
 * Quadro de demandas. Arraste um card para outra coluna, ou use a lista
 * no próprio card (funciona no celular e pelo teclado).
 */
export function TaskBoard({
  columns,
  tasks,
  staff,
  stages,
  subtaskCounts,
  today,
}: {
  columns: TaskColumn[];
  tasks: Task[];
  staff: StaffMember[];
  stages: { id: string; title: string }[];
  subtaskCounts: Record<string, { done: number; total: number }>;
  today: string;
}) {
  const [optimistic, applyMove] = useOptimistic(tasks, (state, move: { id: string; column_id: string }) =>
    state.map((t) => (t.id === move.id ? { ...t, column_id: move.column_id, position: Number.MAX_SAFE_INTEGER } : t)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const names = new Map(staff.map((s) => [s.user_id, s.full_name]));
  const stageNames = new Map(stages.map((s) => [s.id, s.title]));

  function move(id: string, columnId: string) {
    startTransition(async () => {
      applyMove({ id, column_id: columnId });
      await moveTask(id, columnId);
    });
  }

  return (
    <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6">
      {columns.map((col) => {
        const items = col.is_done
          ? optimistic.filter((t) => t.column_id === col.id)
          : sortTasks(optimistic.filter((t) => t.column_id === col.id));
        return (
          <section
            key={col.id}
            aria-label={col.name}
            onDragOver={(e) => { e.preventDefault(); setOver(col.id); }}
            onDragLeave={() => setOver((o) => (o === col.id ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              setOver(null);
              setDragging(null);
              if (id) move(id, col.id);
            }}
            className={cx("flex w-[18.5rem] shrink-0 flex-col rounded-[2rem] p-2 transition", over === col.id && dragging ? "bg-white/70 ring-2 ring-primary" : "bg-white/35")}
          >
            <header className="flex items-center gap-2 px-2 py-2">
              <span className="size-3 rounded-full" style={{ background: tintDot[col.tint] }} />
              <h2 className="flex-1 font-bold">{col.name}</h2>
              <span className="pill bg-white text-muted">{items.length}</span>
            </header>
            <ul className="flex min-h-24 flex-col gap-2">
              {items.map((t) => {
                const p = PRIORITY[t.priority];
                const late = !t.completed_at && t.due_date && t.due_date < today;
                const subs = subtaskCounts[t.id];
                return (
                  <li
                    key={t.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); setDragging(t.id); }}
                    onDragEnd={() => { setDragging(null); setOver(null); }}
                    className={cx("widget cursor-grab rounded-[1.5rem] p-3 shadow-[0_10px_24px_-14px_rgb(59_91_246/0.35)] active:cursor-grabbing", dragging === t.id && "opacity-50")}
                  >
                    <Link href={`/go-up/demanda/${t.id}`} className={cx("block font-semibold leading-snug hover:text-primary", t.completed_at && "text-muted line-through decoration-1")}>
                      {t.title}
                    </Link>
                    {t.stage_id && stageNames.get(t.stage_id) && (
                      <p className="mt-0.5 truncate text-xs text-muted">Etapa: {stageNames.get(t.stage_id)}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {t.priority !== "normal" && <span className={cx("pill h-6 px-2 text-[11px]", p.cls)}>{p.label}</span>}
                      {t.due_date && (
                        <span className={cx("pill h-6 px-2 text-[11px]", late ? "bg-tint-red text-accent" : "bg-tile text-muted")}>
                          {late ? "⚠ " : "📅 "}{shortDate(t.due_date)}
                        </span>
                      )}
                      {subs && subs.total > 0 && (
                        <span className="pill h-6 bg-tile px-2 text-[11px] text-muted">☑ {subs.done}/{subs.total}</span>
                      )}
                      {t.visible_to_client && <span className="pill h-6 bg-tint-purple px-2 text-[11px] text-[#5b3db8]" title="Cliente vê no GO THERE">👁</span>}
                      <span className="ml-auto grid size-7 place-items-center rounded-full bg-tint-blue text-[10px] font-bold text-primary"
                        title={t.assignee_id ? names.get(t.assignee_id) ?? "Responsável" : "Sem responsável"}>
                        {t.assignee_id ? initials(names.get(t.assignee_id)) : "–"}
                      </span>
                    </div>
                    <select
                      value={t.column_id}
                      onChange={(e) => move(t.id, e.target.value)}
                      aria-label={`Mover "${t.title}" para`}
                      className="mt-2 h-8 w-full rounded-xl bg-tile px-2 text-xs font-semibold text-muted outline-none"
                    >
                      {columns.map((c) => <option key={c.id} value={c.id}>{c.id === t.column_id ? `Em: ${c.name}` : `Mover para ${c.name}`}</option>)}
                    </select>
                  </li>
                );
              })}
              {items.length === 0 && (
                <li className="grid h-20 place-items-center rounded-[1.5rem] border-2 border-dashed border-white/80 text-xs text-muted">
                  Solte aqui
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
