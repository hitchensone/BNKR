import Link from "next/link";
import type { PostWithProject } from "@/lib/data/posts";
import { NETWORK, FORMAT, POST_STATUS, compactNumber, engagementRate, localParts, monthGrid, type PostStats } from "@/lib/go-up/posts";
import { Tile, Widget } from "../ui";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const br = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Calendário do mês com os posts em cada dia. */
export function PostCalendar({ month, posts, today }: { month: string; posts: PostWithProject[]; today: string }) {
  const byDay = new Map<string, PostWithProject[]>();
  for (const p of posts) {
    if (!p.scheduled_at) continue;
    const { day } = localParts(p.scheduled_at);
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  const grid = monthGrid(month);

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[44rem] grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => <div key={d} className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">{d}</div>)}
        {grid.flat().map((day, i) => (
          <div key={day ?? `x${i}`} className={`min-h-28 rounded-[1.25rem] p-1.5 ${day ? "bg-tile/50" : ""} ${day === today ? "ring-2 ring-primary" : ""}`}>
            {day && (
              <>
                <p className={`px-1 text-xs font-bold ${day === today ? "text-primary" : "text-muted"}`}>{Number(day.slice(8))}</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {(byDay.get(day) ?? []).map((p) => (
                    <li key={p.id}>
                      <Link href={`/go-up/posts/${p.id}`} title={`${p.title} · ${POST_STATUS[p.status].label}`}
                        className={`block truncate rounded-lg px-1.5 py-1 text-[11px] font-semibold ${POST_STATUS[p.status].cls}`}>
                        {NETWORK[p.network].icon} {localParts(p.scheduled_at!).time} {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PostRow({ post, showClient = true }: { post: PostWithProject; showClient?: boolean }) {
  const st = POST_STATUS[post.status];
  const when = post.scheduled_at ? localParts(post.scheduled_at) : null;
  const eng = engagementRate(post);
  return (
    <Link href={`/go-up/posts/${post.id}`} className="flex flex-wrap items-center gap-3 rounded-[1.5rem] p-2 transition hover:bg-tile/60">
      <Tile tint="purple" size="md">{NETWORK[post.network].icon}</Tile>
      <div className="min-w-40 flex-1">
        <p className="truncate font-semibold">{post.title}</p>
        <p className="truncate text-xs text-muted">
          {showClient && `${post.project?.client?.trade_name || post.project?.client?.name} · `}{FORMAT[post.format]}
          {when ? ` · ${br(when.day)} ${when.time}` : " · sem data"}
          {post.reach != null && ` · alcance ${compactNumber(post.reach)}${eng != null ? ` · ${eng.toLocaleString("pt-BR")}% eng.` : ""}`}
        </p>
      </div>
      <span className={`pill ${st.cls}`}>{st.label}</span>
    </Link>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

/** Resumo de resultados (usado no GO UP e no GO THERE). */
export function StatsSummary({ stats }: { stats: PostStats }) {
  return (
    <Widget className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
      <Metric label="Posts publicados" value={String(stats.published)} note={stats.withMetrics < stats.published ? `${stats.withMetrics} com métricas` : undefined} />
      <Metric label="Alcance" value={compactNumber(stats.reach)} />
      <Metric label="Interações" value={compactNumber(stats.interactions)} note="Curtidas, comentários, compart. e salvos" />
      <Metric label="Engajamento" value={stats.avgEngagement != null ? `${stats.avgEngagement.toLocaleString("pt-BR")}%` : "—"} note="Interações ÷ alcance" />
    </Widget>
  );
}

/** Barras simples (uma série) para comparar redes ou formatos pelo alcance. */
export function BreakdownList({ rows }: { rows: PostStats["byNetwork"] }) {
  const max = Math.max(1, ...rows.map((r) => r.reach));
  if (!rows.length) return <p className="p-2 text-sm text-muted">Sem posts com métricas no período.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex justify-between gap-2 text-sm">
            <span className="font-medium">{r.label} <span className="text-muted">· {r.posts} post{r.posts > 1 ? "s" : ""}</span></span>
            <span className="tabular-nums"><span className="font-semibold">{compactNumber(r.reach)}</span>
              {r.engagement != null && <span className="text-muted"> · {r.engagement.toLocaleString("pt-BR")}%</span>}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-tile">
            <div className="h-2 rounded-full" style={{ width: `${(r.reach / max) * 100}%`, background: "#3b5bf6" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
