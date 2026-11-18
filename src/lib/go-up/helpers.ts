import type { Priority, Task } from "./types.ts";

export const PRIORITY: Record<Priority, { label: string; cls: string; rank: number }> = {
  urgente: { label: "Urgente", cls: "bg-tint-red text-accent", rank: 0 },
  alta: { label: "Alta", cls: "bg-tint-orange text-orange-ink", rank: 1 },
  normal: { label: "Normal", cls: "bg-tile text-muted", rank: 2 },
  baixa: { label: "Baixa", cls: "bg-tile text-muted", rank: 3 },
};

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export type DueBucket = "atrasada" | "hoje" | "semana" | "depois" | "sem_prazo";

/** Em que faixa de prazo a demanda está, a partir de hoje (YYYY-MM-DD). */
export function dueBucket(due: string | null, today: string): DueBucket {
  if (!due) return "sem_prazo";
  if (due < today) return "atrasada";
  if (due === today) return "hoje";
  const t = new Date(`${today}T12:00:00Z`).getTime();
  const d = new Date(`${due}T12:00:00Z`).getTime();
  return (d - t) / 86_400_000 <= 7 ? "semana" : "depois";
}

/** Ordena: prioridade, depois prazo (sem prazo por último), depois posição. */
export function sortTasks<T extends Pick<Task, "priority" | "due_date" | "position">>(list: T[]) {
  return [...list].sort(
    (a, b) =>
      PRIORITY[a.priority].rank - PRIORITY[b.priority].rank ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.position - b.position,
  );
}

export const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
