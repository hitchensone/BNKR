// Postagens: tipos, rótulos e cálculos de estatística (funções puras).

export type Network = "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "x" | "threads" | "pinterest";
export type PostFormat = "feed" | "carrossel" | "reels" | "stories" | "video" | "texto";
export type PostStatus = "ideia" | "producao" | "aprovacao" | "ajustes" | "aprovado" | "agendado" | "publicado";

export interface Post {
  id: string;
  project_id: string;
  task_id: string | null;
  network: Network;
  format: PostFormat;
  title: string;
  caption: string | null;
  scheduled_at: string | null;
  status: PostStatus;
  media_file_id: string | null;
  client_feedback: string | null;
  reviewed_at: string | null;
  published_url: string | null;
  published_at: string | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
  metrics_updated_at: string | null;
}

export const NETWORK: Record<Network, { label: string; icon: string }> = {
  instagram: { label: "Instagram", icon: "📸" },
  facebook: { label: "Facebook", icon: "👍" },
  tiktok: { label: "TikTok", icon: "🎵" },
  linkedin: { label: "LinkedIn", icon: "💼" },
  youtube: { label: "YouTube", icon: "▶️" },
  x: { label: "X", icon: "✖️" },
  threads: { label: "Threads", icon: "🧵" },
  pinterest: { label: "Pinterest", icon: "📌" },
};

export const FORMAT: Record<PostFormat, string> = {
  feed: "Feed", carrossel: "Carrossel", reels: "Reels", stories: "Stories", video: "Vídeo", texto: "Texto",
};

export const POST_STATUS: Record<PostStatus, { label: string; cls: string; clientVisible: boolean }> = {
  ideia: { label: "Ideia", cls: "bg-tile text-muted", clientVisible: false },
  producao: { label: "Em produção", cls: "bg-tint-orange text-orange-ink", clientVisible: false },
  aprovacao: { label: "Aguardando aprovação", cls: "bg-tint-yellow text-warn", clientVisible: true },
  ajustes: { label: "Ajustes pedidos", cls: "bg-tint-red text-accent", clientVisible: true },
  aprovado: { label: "Aprovado", cls: "bg-tint-green text-ok", clientVisible: true },
  agendado: { label: "Agendado", cls: "bg-tint-blue text-primary", clientVisible: true },
  publicado: { label: "Publicado", cls: "bg-tint-purple text-violet", clientVisible: true },
};

/** Interações: curtidas + comentários + compartilhamentos + salvamentos. */
export function interactions(p: Pick<Post, "likes" | "comments" | "shares" | "saves">) {
  return (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saves ?? 0);
}

/** Taxa de engajamento sobre o alcance, em % com 1 casa (null sem alcance). */
export function engagementRate(p: Pick<Post, "reach" | "likes" | "comments" | "shares" | "saves">) {
  if (!p.reach) return null;
  return Math.round((interactions(p) / p.reach) * 1000) / 10;
}

const hasMetrics = (p: Post) => p.status === "publicado" && p.reach != null;

export interface PostStats {
  published: number;
  withMetrics: number;
  reach: number;
  interactions: number;
  views: number;
  avgEngagement: number | null; // média ponderada pelo alcance
  best: Post[];                 // até 3, por engajamento
  byNetwork: { key: string; label: string; posts: number; reach: number; engagement: number | null }[];
  byFormat: { key: string; label: string; posts: number; reach: number; engagement: number | null }[];
}

function group(posts: Post[], keyOf: (p: Post) => string, labelOf: (k: string) => string) {
  const map = new Map<string, Post[]>();
  for (const p of posts) map.set(keyOf(p), [...(map.get(keyOf(p)) ?? []), p]);
  return [...map.entries()]
    .map(([key, list]) => {
      const reach = list.reduce((s, p) => s + (p.reach ?? 0), 0);
      const inter = list.reduce((s, p) => s + interactions(p), 0);
      return { key, label: labelOf(key), posts: list.length, reach, engagement: reach ? Math.round((inter / reach) * 1000) / 10 : null };
    })
    .sort((a, b) => b.reach - a.reach);
}

export function postStats(all: Post[]): PostStats {
  const published = all.filter((p) => p.status === "publicado");
  const measured = published.filter(hasMetrics);
  const reach = measured.reduce((s, p) => s + (p.reach ?? 0), 0);
  const inter = measured.reduce((s, p) => s + interactions(p), 0);
  return {
    published: published.length,
    withMetrics: measured.length,
    reach,
    interactions: inter,
    views: measured.reduce((s, p) => s + (p.views ?? 0), 0),
    avgEngagement: reach ? Math.round((inter / reach) * 1000) / 10 : null,
    best: [...measured].sort((a, b) => (engagementRate(b) ?? 0) - (engagementRate(a) ?? 0)).slice(0, 3),
    byNetwork: group(measured, (p) => p.network, (k) => NETWORK[k as Network].label),
    byFormat: group(measured, (p) => p.format, (k) => FORMAT[k as PostFormat]),
  };
}

/** Grade do mês para o calendário: semanas (seg→dom) com os dias YYYY-MM-DD (null fora do mês). */
export function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // segunda = 0
  const cells: (string | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Data/hora ISO → dia YYYY-MM-DD e hora HH:MM no horário de Brasília. */
export function localParts(iso: string) {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const [day, time] = f.format(new Date(iso)).split(" ");
  return { day, time };
}

export const compactNumber = (n: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
