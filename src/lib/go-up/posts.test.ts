import { test } from "node:test";
import assert from "node:assert/strict";
import { engagementRate, localParts, monthGrid, postStats, type Post } from "./posts.ts";

const post = (p: Partial<Post>): Post => ({
  id: Math.random().toString(), project_id: "p", task_id: null, network: "instagram", format: "feed", title: "", caption: null,
  scheduled_at: null, status: "publicado", media_file_id: null, client_feedback: null, reviewed_at: null, published_url: null,
  published_at: null, reach: null, impressions: null, likes: null, comments: null, shares: null, saves: null, views: null,
  metrics_updated_at: null, ...p,
});

test("engajamento e estatísticas", () => {
  assert.equal(engagementRate({ reach: 1000, likes: 40, comments: 5, shares: 3, saves: 2 }), 5);
  assert.equal(engagementRate({ reach: 0, likes: 1, comments: 0, shares: 0, saves: 0 }), null);
  const s = postStats([
    post({ reach: 1000, likes: 50, format: "reels", views: 3000 }),
    post({ reach: 3000, likes: 60, network: "tiktok" }),
    post({ reach: null }),                  // publicado sem métricas
    post({ status: "agendado", reach: 999 }), // não publicado: fora
  ]);
  assert.equal(s.published, 3);
  assert.equal(s.withMetrics, 2);
  assert.equal(s.reach, 4000);
  assert.equal(s.avgEngagement, 2.8); // 110 / 4000
  assert.equal(s.best[0].format, "reels");
  assert.equal(s.byNetwork[0].key, "tiktok");
  assert.equal(s.views, 3000);
});

test("grade do mês e fuso", () => {
  const g = monthGrid("2026-11"); // 1/11/2026 é domingo
  assert.equal(g[0][6], "2026-11-01");
  assert.equal(g[0][0], null);
  assert.equal(g.flat().filter(Boolean).length, 30);
  assert.deepEqual(localParts("2026-12-10T18:00:00Z"), { day: "2026-12-10", time: "15:00" });
});
