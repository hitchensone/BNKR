import Link from "next/link";
import { BreakdownList, PostRow, StatsSummary } from "@/components/go-up/post-views";
import { Bridge, Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff, todaySP } from "@/lib/data/session";
import { listProjects } from "@/lib/data/portal";
import { listPosts } from "@/lib/data/posts";
import { postStats } from "@/lib/go-up/posts";

const PERIODS = [30, 90, 180, 365];

export default async function PostStatsPage({ searchParams }: PageProps<"/go-up/posts/estatisticas">) {
  await requireStaff();
  const today = await todaySP();
  const { projeto, dias } = await searchParams;
  const days = PERIODS.includes(Number(dias)) ? Number(dias) : 90;
  const projectId = typeof projeto === "string" && projeto ? projeto : undefined;
  const from = new Date(new Date(`${today}T12:00:00Z`).getTime() - days * 86_400_000).toISOString().slice(0, 10);

  const [projects, posts] = await Promise.all([listProjects(), listPosts({ from, to: today, projectId })]);
  const stats = postStats(posts);

  return (
    <div className="flex flex-col gap-8">
      <Widget className="flex flex-wrap items-center gap-4 p-3 pr-4">
        <Link href="/go-up/posts" aria-label="Voltar às postagens" className="tile size-12 text-lg">←</Link>
        <Tile tint="blue" size="lg">📊</Tile>
        <div className="min-w-40 flex-1">
          <h1 className="text-xl font-bold tracking-tight">Estatísticas de postagens</h1>
          <p className="text-sm text-muted">Últimos {days} dias, posts publicados</p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <select name="projeto" defaultValue={projectId ?? ""} aria-label="Cliente" className="field w-auto min-w-56">
            <option value="">Todos os clientes</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.client?.trade_name || p.client?.name} · {p.name}</option>)}
          </select>
          <select name="dias" defaultValue={days} aria-label="Período" className="field w-auto">
            {PERIODS.map((d) => <option key={d} value={d}>{d} dias</option>)}
          </select>
          <button className="btn btn-soft">Ver</button>
        </form>
      </Widget>

      <StatsSummary stats={stats} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <WidgetGroup className="xl:col-span-1">
          <div className="widget flex items-center gap-4 p-3"><Tile tint="green" size="md">🏆</Tile>
            <div><h2 className="text-lg font-bold">Melhores posts</h2><p className="text-sm text-muted">Por taxa de engajamento</p></div></div>
          <Bridge align="start" offset="3.5rem" />
          <ul className="widget flex flex-col gap-1 p-2">
            {stats.best.map((p) => <li key={p.id}><PostRow post={posts.find((x) => x.id === p.id)!} showClient={!projectId} /></li>)}
            {stats.best.length === 0 && <li className="p-6 text-center text-sm text-muted">Preencha as métricas dos posts publicados para ver o ranking.</li>}
          </ul>
        </WidgetGroup>
        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3"><Tile tint="purple" size="md">🌐</Tile>
            <div><h2 className="text-lg font-bold">Por rede</h2><p className="text-sm text-muted">Alcance e engajamento</p></div></div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5"><BreakdownList rows={stats.byNetwork} /></div>
        </WidgetGroup>
        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3"><Tile tint="orange" size="md">🎞️</Tile>
            <div><h2 className="text-lg font-bold">Por formato</h2><p className="text-sm text-muted">Alcance e engajamento</p></div></div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5"><BreakdownList rows={stats.byFormat} /></div>
        </WidgetGroup>
      </div>
    </div>
  );
}
