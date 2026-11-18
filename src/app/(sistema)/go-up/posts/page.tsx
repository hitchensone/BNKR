import Link from "next/link";
import { PostForm } from "@/components/go-up/post-forms";
import { PostCalendar, PostRow } from "@/components/go-up/post-views";
import { Bridge, Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff, todaySP } from "@/lib/data/session";
import { listProjects } from "@/lib/data/portal";
import { listPosts, listProjectMedia } from "@/lib/data/posts";
import { monthLabel, monthOf, monthRange, shiftMonth } from "@/lib/go-grand/summary";
import { Icon3D } from "@/components/icon3d";

export default async function PostsPage({ searchParams }: PageProps<"/go-up/posts">) {
  await requireStaff();
  const today = await todaySP();
  const { mes, projeto } = await searchParams;
  const month = typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : monthOf(today);
  const projectId = typeof projeto === "string" && projeto ? projeto : undefined;
  const { from, to } = monthRange(month);

  const [projects, posts, unscheduled, media] = await Promise.all([
    listProjects(),
    listPosts({ from, to, projectId }),
    listPosts({ unscheduled: true, projectId }),
    listProjectMedia(),
  ]);
  const active = projects.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const label = (p: (typeof projects)[number]) => `${p.client?.trade_name || p.client?.name} · ${p.name}`;
  const q = (m: string) => `/go-up/posts?mes=${m}${projectId ? `&projeto=${projectId}` : ""}`;
  const waiting = posts.filter((p) => p.status === "aprovacao" || p.status === "ajustes");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-6">
        <Widget className="flex min-w-72 flex-1 flex-wrap items-center gap-4 p-3 pr-4">
          <Link href="/go-up" aria-label="Voltar ao GO UP" className="tile size-12 text-lg">←</Link>
          <Tile tint="purple" size="lg">📅</Tile>
          <div className="min-w-40 flex-1">
            <h1 className="text-xl font-bold tracking-tight">Postagens</h1>
            <p className="text-sm text-muted">Calendário, aprovação e resultados dos clientes</p>
          </div>
          <Link href={`/go-up/posts/estatisticas${projectId ? `?projeto=${projectId}` : ""}`} className="btn btn-soft h-10 px-4 text-sm"><Icon3D e="📊" /> Estatísticas</Link>
        </Widget>
        <Widget className="flex w-full items-center justify-between gap-2 p-3 sm:w-auto">
          <Link href={q(shiftMonth(month, -1))} aria-label="Mês anterior" className="tile size-11">←</Link>
          <p className="min-w-40 px-2 text-center font-bold">{monthLabel(month)}</p>
          <Link href={q(shiftMonth(month, 1))} aria-label="Próximo mês" className="tile size-11">→</Link>
        </Widget>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="mes" value={month} />
        <select name="projeto" defaultValue={projectId ?? ""} aria-label="Filtrar por projeto" className="field w-auto min-w-64 bg-raised">
          <option value="">Todos os clientes</option>
          {active.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
        </select>
        <button className="btn btn-soft bg-raised">Filtrar</button>
      </form>

      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="blue" size="md">🗓️</Tile>
          <div>
            <h2 className="text-lg font-bold">{monthLabel(month)}</h2>
            <p className="text-sm text-muted">{posts.length} post{posts.length === 1 ? "" : "s"} no mês{waiting.length ? ` · ${waiting.length} esperando o cliente` : ""}</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget p-3"><PostCalendar month={month} posts={posts} today={today} /></div>
      </WidgetGroup>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="yellow" size="md">💡</Tile>
            <div>
              <h2 className="text-lg font-bold">Sem data</h2>
              <p className="text-sm text-muted">Ideias e posts ainda sem agendamento.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <ul className="widget flex flex-col gap-1 p-2">
            {unscheduled.map((p) => <li key={p.id}><PostRow post={p} /></li>)}
            {unscheduled.length === 0 && <li className="p-6 text-center text-sm text-muted">Nenhum post sem data.</li>}
          </ul>
        </WidgetGroup>

        <WidgetGroup className="h-fit">
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="purple" size="md">➕</Tile>
            <div>
              <h2 className="text-lg font-bold">Novo post</h2>
              <p className="text-sm text-muted">Em &quot;Aguardando aprovação&quot;, o cliente aprova pelo GO THERE.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5">
            <PostForm projects={active.map((p) => ({ id: p.id, label: label(p) }))} media={media} defaultDate={month === monthOf(today) ? today : `${month}-01`} />
          </div>
        </WidgetGroup>
      </div>
    </div>
  );
}
