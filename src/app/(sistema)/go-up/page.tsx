import Link from "next/link";
import { ProgressBar } from "@/components/go-there/portal";
import { Tile, Widget } from "@/components/ui";
import { requireStaff, todaySP } from "@/lib/data/session";
import { listProjects } from "@/lib/data/portal";
import { listMyTasks, listTaskCounts } from "@/lib/data/work";
import { Icon3D } from "@/components/icon3d";

export default async function GoUpPage() {
  const session = await requireStaff();
  const today = await todaySP();
  const [projects, counts, mine] = await Promise.all([listProjects(), listTaskCounts(today), listMyTasks(session.userId)]);
  const active = projects.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const isAdmin = session.roles.some((r) => r === "owner" || r === "admin");
  const myLate = mine.filter((t) => t.due_date && t.due_date < today).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-6">
        <Widget className="flex min-w-72 flex-1 flex-wrap items-center gap-4 p-3 pr-4">
          <Tile tint="blue" size="lg">🚀</Tile>
          <div className="min-w-40 flex-1">
            <h1 className="text-xl font-bold tracking-tight">GO UP</h1>
            <p className="text-sm text-muted">Projetos, demandas e fluxos da agência</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/go-up/posts" className="btn btn-primary h-10 px-4 text-sm"><Icon3D e="📅" /> Postagens</Link>
          {isAdmin && (
            <>
              <Link href="/go-up/config" className="btn btn-soft h-10 px-4 text-sm"><Icon3D e="⚙️" /> Fluxo e modelos</Link>
              <Link href="/go-up/equipe" className="btn btn-soft h-10 px-4 text-sm"><Icon3D e="👥" /> Equipe</Link>
            </>
          )}
          </div>
        </Widget>
        <Link href="/go-up/minhas" className="widget flex w-full items-center gap-4 p-3 pr-5 transition hover:-translate-y-0.5 sm:w-auto">
          <Tile tint={myLate ? "red" : "green"} size="lg">🙋</Tile>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Minhas demandas</p>
            <p className="text-2xl font-bold">{mine.length}</p>
            <p className="text-xs text-muted">{myLate ? <span className="text-accent"><Icon3D e="⚠" /> {myLate} atrasada{myLate > 1 ? "s" : ""}</span> : "Nada atrasado"}</p>
          </div>
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {active.map((p) => {
          const c = counts.get(p.id) ?? { total: 0, open: 0, late: 0 };
          const done = c.total - c.open;
          const pct = c.total ? Math.round((done / c.total) * 100) : 0;
          return (
            <li key={p.id}>
              <Link href={`/go-up/${p.id}`} className="widget flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <Tile tint="blue" size="md">📁</Tile>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{p.client?.trade_name || p.client?.name}</p>
                    <p className="truncate text-lg font-bold">{p.name}</p>
                  </div>
                </div>
                <ProgressBar value={pct} />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted">{c.total ? `${done} de ${c.total} demandas` : "Sem demandas ainda"}</span>
                  {c.late > 0 && <span className="pill ml-auto bg-tint-red text-accent"><Icon3D e="⚠" /> {c.late} atrasada{c.late > 1 ? "s" : ""}</span>}
                </div>
              </Link>
            </li>
          );
        })}
        {active.length === 0 && (
          <li className="widget p-6 text-center text-sm text-muted md:col-span-2 xl:col-span-3">
            Nenhum projeto ativo. Eles nascem quando um contrato é assinado no GO CL, ou pelo GO THERE.
          </li>
        )}
      </ul>
    </div>
  );
}
