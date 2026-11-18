"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { newPost, reviewPostAction, saveMetrics, savePost, type PostState } from "@/app/(sistema)/go-up/posts/actions";
import { FORMAT, NETWORK, POST_STATUS, localParts, type Post } from "@/lib/go-up/posts";

const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";

function Feedback({ state }: { state: PostState }) {
  if (!state) return null;
  return state.error
    ? <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>
    : <p role="status" className="text-sm font-medium text-ok">{state.ok}</p>;
}

type Media = { id: string; name: string; project_id: string | null; mime_type: string | null };
type ProjectOption = { id: string; label: string };

export function PostForm({
  post,
  projects,
  media,
  defaultDate,
}: {
  post?: Post;
  projects?: ProjectOption[];
  media: Media[];
  defaultDate?: string;
}) {
  const [state, action, pending] = useActionState(post ? savePost : newPost, null);
  const [projectId, setProjectId] = useState(post?.project_id ?? projects?.[0]?.id ?? "");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!post && state?.ok) ref.current?.reset();
  }, [state, post]);
  const parts = post?.scheduled_at ? localParts(post.scheduled_at) : null;
  const options = media.filter((m) => m.project_id === projectId);

  return (
    <form ref={ref} action={action} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {post && <input type="hidden" name="id" value={post.id} />}
      {projects ? (
        <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Projeto</span>
          <select name="project_id" value={projectId} onChange={(e) => setProjectId(e.target.value)} required className="field">
            {projects.length === 0 && <option value="">Nenhum projeto ativo</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select></label>
      ) : null}
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Nome do post</span>
        <input name="title" required defaultValue={post?.title} placeholder="Ex.: Reels de Natal – bastidores" className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Rede</span>
        <select name="network" defaultValue={post?.network ?? "instagram"} className="field">
          {Object.entries(NETWORK).map(([id, n]) => <option key={id} value={id}>{n.icon} {n.label}</option>)}
        </select></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Formato</span>
        <select name="format" defaultValue={post?.format ?? "feed"} className="field">
          {Object.entries(FORMAT).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
        </select></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Data</span>
        <input name="date" type="date" defaultValue={parts?.day ?? defaultDate ?? ""} className="field" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Horário</span>
        <input name="time" type="time" defaultValue={parts?.time ?? "12:00"} className="field" /></label>
      <label className="flex flex-col gap-1.5 sm:col-span-2"><span className={caption}>Legenda</span>
        <textarea name="caption" rows={5} defaultValue={post?.caption ?? ""} placeholder="Texto do post, hashtags, chamada..." className="field h-auto py-3" /></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Prévia (arquivo do projeto)</span>
        <select name="media_file_id" defaultValue={post?.media_file_id ?? ""} className="field">
          <option value="">Sem prévia</option>
          {options.map((m) => <option key={m.id} value={m.id}>{m.mime_type?.startsWith("video/") ? "🎬" : "🖼️"} {m.name}</option>)}
        </select></label>
      <label className="flex flex-col gap-1.5"><span className={caption}>Situação</span>
        <select name="status" defaultValue={post?.status ?? "ideia"} className="field">
          {Object.entries(POST_STATUS).map(([id, s]) => <option key={id} value={id}>{s.label}{s.clientVisible ? "" : " (cliente não vê)"}</option>)}
        </select></label>
      {options.length === 0 && (
        <p className="text-xs text-muted sm:col-span-2">Para usar uma prévia, envie a imagem ou o vídeo em Arquivos, no GO THERE do projeto.</p>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending || (projects && projects.length === 0)} className="btn btn-primary">{pending ? "Salvando..." : post ? "Salvar post" : "Criar post"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function MetricsForm({ post }: { post: Post }) {
  const [state, action, pending] = useActionState(saveMetrics, null);
  const field = (name: keyof Post, label: string) => (
    <label className="flex flex-col gap-1.5"><span className={caption}>{label}</span>
      <input name={name} inputMode="numeric" defaultValue={(post[name] as number | null) ?? ""} placeholder="0" className="field" /></label>
  );
  return (
    <form action={action} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <input type="hidden" name="id" value={post.id} />
      {field("reach", "Alcance")}
      {field("impressions", "Impressões")}
      {field("views", "Visualizações")}
      {field("likes", "Curtidas")}
      {field("comments", "Comentários")}
      {field("shares", "Compartilham.")}
      {field("saves", "Salvamentos")}
      <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-4"><span className={caption}>Link do post publicado</span>
        <input name="published_url" type="url" defaultValue={post.published_url ?? ""} placeholder="https://instagram.com/p/..." className="field" /></label>
      <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-4">
        <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Salvar métricas"}</button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

/** Aprovação pelo cliente (GO THERE). */
export function ReviewForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(reviewPostAction, null);
  const [adjust, setAdjust] = useState(false);
  if (state?.ok) return <p role="status" className="rounded-[1.25rem] bg-tint-green p-3 text-sm font-semibold text-ok">{state.ok}</p>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={postId} />
      {adjust && (
        <textarea name="feedback" required rows={3} autoFocus placeholder="O que precisa mudar?" aria-label="O que precisa mudar" className="field h-auto bg-raised py-3" />
      )}
      <div className="flex flex-wrap gap-2">
        {!adjust ? (
          <>
            <button name="decision" value="aprovar" disabled={pending} className="btn btn-primary h-10 px-5 text-sm">✓ Aprovar</button>
            <button type="button" onClick={() => setAdjust(true)} className="btn btn-soft h-10 bg-raised px-5 text-sm">Pedir ajuste</button>
          </>
        ) : (
          <>
            <button name="decision" value="ajustar" disabled={pending} className="btn btn-accent h-10 px-5 text-sm">Enviar pedido de ajuste</button>
            <button type="button" onClick={() => setAdjust(false)} className="btn btn-soft h-10 bg-raised px-4 text-sm">Cancelar</button>
          </>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}
