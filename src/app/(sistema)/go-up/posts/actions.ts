"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession, requireStaff } from "@/lib/data/session";
import { createPost, deletePost, getPost, reviewPost, updatePost } from "@/lib/data/posts";

export type PostState = { ok?: string; error?: string } | null;

const uuid = z.uuid();
const optUuid = z.string().transform((v) => (v ? v : null)).pipe(z.uuid().nullable());
const text = z.string().trim().transform((v) => v || null);
const NETWORKS = ["instagram", "facebook", "tiktok", "linkedin", "youtube", "x", "threads", "pinterest"] as const;
const FORMATS = ["feed", "carrossel", "reels", "stories", "video", "texto"] as const;
const STATUSES = ["ideia", "producao", "aprovacao", "ajustes", "aprovado", "agendado", "publicado"] as const;

/** "2026-12-10" + "15:00" no horário de Brasília → ISO. */
const when = (date: string, time: string) => (date ? new Date(`${date}T${time || "12:00"}:00-03:00`).toISOString() : null);

function refresh(projectId?: string, postId?: string) {
  revalidatePath("/go-up/posts", "layout");
  if (projectId) revalidatePath(`/go-there/${projectId}`);
  if (postId) revalidatePath(`/go-up/posts/${postId}`);
}

const PostSchema = z.object({
  project_id: uuid.optional(),
  network: z.enum(NETWORKS),
  format: z.enum(FORMATS),
  title: z.string().trim().min(1, "Dê um nome ao post."),
  caption: text,
  date: z.string(),
  time: z.string(),
  status: z.enum(STATUSES),
  media_file_id: optUuid,
  task_id: optUuid.optional(),
});

export async function newPost(_: PostState, formData: FormData): Promise<PostState> {
  await requireStaff();
  const parsed = PostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.project_id) return { error: "Escolha o projeto." };
  const { date, time, ...data } = parsed.data;
  await createPost({ ...data, project_id: parsed.data.project_id, scheduled_at: when(date, time) });
  refresh(parsed.data.project_id);
  return { ok: "Post criado." };
}

export async function savePost(_: PostState, formData: FormData): Promise<PostState> {
  await requireStaff();
  const id = uuid.safeParse(formData.get("id"));
  const parsed = PostSchema.safeParse(Object.fromEntries(formData));
  if (!id.success || !parsed.success) return { error: parsed.success ? "Post inválido." : parsed.error.issues[0].message };
  // O projeto não muda depois de criado.
  const { date, time, ...rest } = parsed.data;
  const data = { ...rest, project_id: undefined };
  const post = await getPost(id.data);
  if (!post) return { error: "Post não encontrado." };
  // Voltar para aprovação limpa o retorno anterior do cliente.
  const resetFeedback = data.status === "aprovacao" && post.status !== "aprovacao" ? { client_feedback: null } : {};
  await updatePost(id.data, { ...data, scheduled_at: when(date, time), ...resetFeedback });
  refresh(post.project_id, id.data);
  return { ok: "Post salvo." };
}

const count = z.string().trim().transform((v) => (v === "" ? null : Number(v.replace(/\D/g, "")))).refine((v) => v === null || Number.isFinite(v));

export async function saveMetrics(_: PostState, formData: FormData): Promise<PostState> {
  await requireStaff();
  const parsed = z
    .object({
      id: uuid, published_url: text,
      reach: count, impressions: count, likes: count, comments: count, shares: count, saves: count, views: count,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Use só números nas métricas." };
  const { id, ...metrics } = parsed.data;
  const post = await getPost(id);
  if (!post) return { error: "Post não encontrado." };
  await updatePost(id, { ...metrics, metrics_updated_at: new Date().toISOString(), ...(post.status !== "publicado" && { status: "publicado" as const }) });
  refresh(post.project_id, id);
  return { ok: "Métricas salvas." };
}

export async function quickStatus(formData: FormData) {
  await requireStaff();
  const id = uuid.parse(formData.get("id"));
  const status = z.enum(STATUSES).parse(formData.get("status"));
  const post = await getPost(id);
  if (!post) return;
  await updatePost(id, { status, ...(status === "aprovacao" && { client_feedback: null }) });
  refresh(post.project_id, id);
}

export async function removePost(formData: FormData) {
  await requireStaff();
  const id = uuid.parse(formData.get("id"));
  const post = await getPost(id);
  if (!post) return;
  await deletePost(id);
  refresh(post.project_id);
  redirect("/go-up/posts");
}

/** Cliente (ou equipe) aprova ou pede ajuste — regras no banco (review_post). */
export async function reviewPostAction(_: PostState, formData: FormData): Promise<PostState> {
  await requireSession();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return { error: "Post inválido." };
  const approve = formData.get("decision") === "aprovar";
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  try {
    await reviewPost(id.data, approve, feedback);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar." };
  }
  const post = await getPost(id.data);
  refresh(post?.project_id, id.data);
  return { ok: approve ? "Post aprovado. Obrigado!" : "Pedido de ajuste enviado à agência." };
}
