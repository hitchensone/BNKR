import Link from "next/link";
import type { PostWithProject } from "@/lib/data/posts";
import { FORMAT, NETWORK, POST_STATUS, localParts, postStats } from "@/lib/go-up/posts";
import { ReviewForm } from "../go-up/post-forms";
import { StatsSummary } from "../go-up/post-views";
import { Bridge, Tile, WidgetGroup } from "../ui";
import { Icon3D } from "@/components/icon3d";

const when = (iso: string | null) => {
  if (!iso) return "Sem data";
  const { day, time } = localParts(iso);
  return `${day.slice(8, 10)}/${day.slice(5, 7)} às ${time}`;
};

/** Postagens do projeto no portal: aprovação, próximos posts e resultados. */
export function PortalPosts({ posts, isStaff, today }: { posts: PostWithProject[]; isStaff: boolean; today: string }) {
  // No portal, a equipe vê o mesmo que o cliente.
  const visible = posts.filter((p) => POST_STATUS[p.status].clientVisible);
  if (visible.length === 0) return null;

  const review = visible.filter((p) => p.status === "aprovacao" || p.status === "ajustes");
  const upcoming = visible.filter((p) => (p.status === "aprovado" || p.status === "agendado") && (!p.scheduled_at || localParts(p.scheduled_at).day >= today));
  const stats = postStats(visible);

  return (
    <div className="flex flex-col gap-8">
      {review.length > 0 && (
        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="yellow" size="md">✅</Tile>
            <div>
              <h2 className="text-lg font-bold">{isStaff ? "Posts com o cliente" : "Posts para você aprovar"}</h2>
              <p className="text-sm text-muted">{review.filter((p) => p.status === "aprovacao").length} aguardando aprovação</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <ul className="widget grid grid-cols-1 gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
            {review.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 rounded-[1.75rem] bg-tile/60 p-3">
                {p.media_url && (p.media_type?.startsWith("video/")
                  ? <video src={p.media_url} controls className="aspect-square w-full rounded-[1.25rem] bg-black object-contain" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={p.media_url} alt={`Prévia de ${p.title}`} className="aspect-square w-full rounded-[1.25rem] object-cover" />)}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.title}</p>
                    <p className="text-xs text-muted">{NETWORK[p.network].icon} {NETWORK[p.network].label} · {FORMAT[p.format]} · {when(p.scheduled_at)}</p>
                  </div>
                  <span className={`pill ${POST_STATUS[p.status].cls}`}>{POST_STATUS[p.status].label}</span>
                </div>
                {p.caption && <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-[1.25rem] bg-raised p-3 text-sm">{p.caption}</p>}
                {p.status === "ajustes" && p.client_feedback && (
                  <p className="rounded-[1.25rem] bg-tint-red p-3 text-sm"><span className="font-semibold">Ajuste pedido:</span> {p.client_feedback}</p>
                )}
                {p.status === "aprovacao" && !isStaff && <ReviewForm postId={p.id} />}
                {isStaff && (
                  <Link href={`/go-up/posts/${p.id}`} className="btn btn-soft h-10 bg-raised px-4 text-sm">Abrir no GO UP</Link>
                )}
              </li>
            ))}
          </ul>
        </WidgetGroup>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {upcoming.length > 0 && (
          <WidgetGroup>
            <div className="widget flex items-center gap-4 p-3">
              <Tile tint="blue" size="md">🗓️</Tile>
              <div><h2 className="text-lg font-bold">Próximos posts</h2><p className="text-sm text-muted">Aprovados e agendados</p></div>
            </div>
            <Bridge align="start" offset="3.5rem" />
            <ul className="widget flex flex-col gap-1 p-2">
              {upcoming.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-[1.25rem] p-2">
                  <Tile tint="purple" size="sm">{NETWORK[p.network].icon}</Tile>
                  <div className="min-w-40 flex-1">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="text-xs text-muted">{FORMAT[p.format]} · {when(p.scheduled_at)}</p>
                  </div>
                  <span className={`pill ${POST_STATUS[p.status].cls}`}>{POST_STATUS[p.status].label}</span>
                </li>
              ))}
            </ul>
          </WidgetGroup>
        )}
        {stats.published > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="px-2 font-bold"><Icon3D e="📈" /> Resultados das publicações</h2>
            <StatsSummary stats={stats} />
          </div>
        )}
      </div>
    </div>
  );
}
