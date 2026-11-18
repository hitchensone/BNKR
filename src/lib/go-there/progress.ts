import type { Stage } from "./types.ts";

/** Progresso do projeto: concluídas valem 1, em andamento valem meio. */
export function progressOf(stages: Pick<Stage, "status">[]) {
  if (stages.length === 0) return 0;
  const done = stages.reduce((s, st) => s + (st.status === "concluida" ? 1 : st.status === "em_andamento" ? 0.5 : 0), 0);
  return Math.round((done / stages.length) * 100);
}

/** Etapa atual: a primeira em andamento ou, se não houver, a primeira pendente. */
export function currentStage<T extends Pick<Stage, "status" | "position">>(stages: T[]) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  return sorted.find((s) => s.status === "em_andamento") ?? sorted.find((s) => s.status === "pendente") ?? null;
}

/** Nome seguro para o caminho no armazenamento (sem acentos nem barras). */
export function safeFileName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.replace(/^-+|-+$/g, "").slice(-120) || "arquivo";
}

export function formatBytes(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1).replace(".", ",")} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
}
