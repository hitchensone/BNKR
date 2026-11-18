import { createClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/go-up/posts";

// Postagens. O RLS esconde do cliente as ideias e posts em produção.

export type PostWithProject = Post & {
  project: { name: string; client: { name: string; trade_name: string | null } | null } | null;
  media_url?: string | null;
  media_type?: string | null;
};

const FIELDS = "*, project:projects(name, client:clients(name, trade_name)), media:files(bucket, path, name, mime_type)";

type Row = PostWithProject & { media: { bucket: string; path: string; name: string; mime_type: string | null } | null };

/** Posts num intervalo (por data agendada), com link temporário da prévia. */
export async function listPosts(opts: { from?: string; to?: string; projectId?: string; projectIds?: string[]; unscheduled?: boolean }) {
  const supabase = await createClient();
  let q = supabase.from("posts").select(FIELDS);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.projectIds) q = q.in("project_id", opts.projectIds);
  if (opts.unscheduled) q = q.is("scheduled_at", null);
  else {
    if (opts.from) q = q.gte("scheduled_at", `${opts.from}T00:00:00-03:00`);
    if (opts.to) q = q.lte("scheduled_at", `${opts.to}T23:59:59-03:00`);
  }
  const { data, error } = await q.order("scheduled_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return withMedia((data ?? []) as Row[]);
}

async function withMedia(rows: Row[]) {
  const supabase = await createClient();
  return Promise.all(
    rows.map(async ({ media, ...p }) => {
      if (!media) return { ...p, media_url: null, media_type: null } as PostWithProject;
      const { data } = await supabase.storage.from(media.bucket).createSignedUrl(media.path, 60 * 60);
      return { ...p, media_url: data?.signedUrl ?? null, media_type: media.mime_type } as PostWithProject;
    }),
  );
}

export async function getPost(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(FIELDS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return (await withMedia([data as Row]))[0];
}

/** Imagens e vídeos do projeto, para escolher como prévia do post. */
export async function listProjectMedia(projectId?: string) {
  const supabase = await createClient();
  let q = supabase.from("files").select("id, name, project_id, mime_type").or("mime_type.like.image/%,mime_type.like.video/%");
  if (projectId) q = q.eq("project_id", projectId);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data as { id: string; name: string; project_id: string | null; mime_type: string | null }[];
}

export type PostInput = Partial<Omit<Post, "id" | "published_at" | "reviewed_at" | "client_feedback">>;

export async function createPost(input: PostInput & Pick<Post, "project_id" | "network" | "format" | "title">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").insert(input).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updatePost(id: string, patch: PostInput & { client_feedback?: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deletePost(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}

export async function reviewPost(id: string, approve: boolean, feedback: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_post", { _post_id: id, _approve: approve, _feedback: feedback });
  if (error) throw new Error(error.message);
}
