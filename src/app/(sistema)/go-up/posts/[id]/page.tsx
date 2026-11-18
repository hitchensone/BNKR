import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { MetricsForm, PostForm } from "@/components/go-up/post-forms";
import { Bridge, Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff } from "@/lib/data/session";
import { getPost, listProjectMedia } from "@/lib/data/posts";
import { NETWORK, POST_STATUS, engagementRate } from "@/lib/go-up/posts";
import { formatDateTime } from "@/components/go-cl/labels";
import { removePost } from "../actions";

export default async function PostPage({ params }: PageProps<"/go-up/posts/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const post = await getPost(id);
  if (!post) notFound();
  const media = await listProjectMedia(post.project_id);
  const st = POST_STATUS[post.status];
  const eng = engagementRate(post);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <WidgetGroup row className="w-full">
        <Link href="/go-up/posts" aria-label="Voltar ao calendário" className="widget grid place-items-center p-3">
          <span className="tile size-12 text-lg">←</span>
        </Link>
        <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
        <div className="widget flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-3 pr-5">
          <Tile tint="purple" size="lg">{NETWORK[post.network].icon}</Tile>
          <div className="min-w-40 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">
              {post.project?.client?.trade_name || post.project?.client?.name} · {post.project?.name}
            </p>
            <h1 className="text-xl font-bold tracking-tight">{post.title}</h1>
          </div>
          <span className={`pill ${st.cls}`}>{st.label}</span>
        </div>
      </WidgetGroup>

      {post.client_feedback && (
        <Widget className="flex items-start gap-4 p-4">
          <Tile tint={post.status === "ajustes" ? "red" : "green"} size="md">{post.status === "ajustes" ? "✏️" : "💬"}</Tile>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Retorno do cliente{post.reviewed_at ? ` · ${formatDateTime(post.reviewed_at)}` : ""}
            </p>
            <p className="whitespace-pre-line">{post.client_feedback}</p>
          </div>
        </Widget>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Widget className="p-5"><PostForm post={post} media={media} /></Widget>

        <div className="flex flex-col gap-8">
          <Widget className="flex flex-col gap-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Prévia</p>
            {post.media_url ? (
              post.media_type?.startsWith("video/")
                ? <video src={post.media_url} controls className="w-full rounded-[1.25rem]" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={post.media_url} alt={`Prévia de ${post.title}`} className="w-full rounded-[1.25rem] object-cover" />
            ) : <p className="rounded-[1.25rem] bg-tile p-6 text-center text-sm text-muted">Sem prévia</p>}
          </Widget>

          <WidgetGroup>
            <div className="widget flex items-center gap-4 p-3">
              <Tile tint="blue" size="md">📈</Tile>
              <div>
                <h2 className="text-lg font-bold">Resultados</h2>
                <p className="text-sm text-muted">{eng != null ? `Engajamento de ${eng.toLocaleString("pt-BR")}%` : "Preencha depois de publicado"}</p>
              </div>
            </div>
            <Bridge align="start" offset="3.5rem" />
            <div className="widget p-4"><MetricsForm post={post} /></div>
          </WidgetGroup>

          <form action={removePost}>
            <input type="hidden" name="id" value={post.id} />
            <button className="px-2 text-xs font-semibold text-accent hover:underline">Excluir este post</button>
          </form>
        </div>
      </div>
    </div>
  );
}
