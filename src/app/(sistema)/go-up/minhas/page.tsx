import Link from "next/link";
import { Tile, Widget } from "@/components/ui";
import { requireStaff, todaySP } from "@/lib/data/session";
import { listMyTasks } from "@/lib/data/work";
import { PRIORITY, dueBucket, shortDate, sortTasks, type DueBucket } from "@/lib/go-up/helpers";

const GROUPS: { id: DueBucket; title: string; icon: string; tint: "red" | "orange" | "yellow" | "blue" | "purple" }[] = [
  { id: "atrasada", title: "Atrasadas", icon: "⚠️", tint: "red" },
  { id: "hoje", title: "Para hoje", icon: "🔥", tint: "orange" },
  { id: "semana", title: "Próximos 7 dias", icon: "📅", tint: "yellow" },
  { id: "depois", title: "Mais pra frente", icon: "🗓️", tint: "blue" },
  { id: "sem_prazo", title: "Sem prazo", icon: "🗂️", tint: "purple" },
];

export default async function MyTasksPage() {
  const session = await requireStaff();
  const [tasks, today] = await Promise.all([listMyTasks(session.userId), todaySP()]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <Widget className="flex items-center gap-4 p-3">
        <Link href="/go-up" aria-label="Voltar ao GO UP" className="tile size-12 text-lg">←</Link>
        <Tile tint="green" size="lg">🙋</Tile>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas demandas</h1>
          <p className="text-sm text-muted">{tasks.length} em aberto com você, em todos os projetos</p>
        </div>
      </Widget>

      {GROUPS.map((g) => {
        const list = sortTasks(tasks.filter((t) => dueBucket(t.due_date, today) === g.id));
        if (!list.length) return null;
        return (
          <section key={g.id} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 px-2 font-bold"><span aria-hidden>{g.icon}</span>{g.title}<span className="pill bg-white text-muted">{list.length}</span></h2>
            <ul className="widget flex flex-col gap-1 p-2">
              {list.map((t) => (
                <li key={t.id}>
                  <Link href={`/go-up/demanda/${t.id}`} className="flex flex-wrap items-center gap-3 rounded-[1.5rem] p-2 transition hover:bg-tile/60">
                    <Tile tint={g.tint} size="sm">{t.parent_id ? "☑" : "📌"}</Tile>
                    <div className="min-w-40 flex-1">
                      <p className="truncate font-semibold">{t.title}</p>
                      <p className="truncate text-xs text-muted">{t.project?.client?.trade_name || t.project?.client?.name} · {t.project?.name}</p>
                    </div>
                    {t.priority !== "normal" && <span className={`pill ${PRIORITY[t.priority].cls}`}>{PRIORITY[t.priority].label}</span>}
                    {t.due_date && <span className="pill bg-tile text-muted">{shortDate(t.due_date)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {tasks.length === 0 && <Widget className="p-8 text-center text-muted">Nada com você agora. 🎉</Widget>}
    </div>
  );
}
