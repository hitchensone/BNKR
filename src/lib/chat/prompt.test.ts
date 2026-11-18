import { test } from "node:test";
import assert from "node:assert/strict";
import { mentionsAssistant, systemPrompt, toModelMessages } from "./prompt.ts";
import type { ChatMessage } from "./helpers.ts";

const m = (id: string, kind: ChatMessage["kind"], name: string | null, body: string, deleted = false): ChatMessage => ({
  id, channel_id: "c", author_id: name, author_name: name, kind, body, edited_at: null,
  deleted_at: deleted ? "2026-11-18T00:00:00Z" : null, created_at: `2026-11-18T10:0${id}:00Z`,
});

test("detecta a menção ao assistente", () => {
  assert.ok(mentionsAssistant("@assistente quando sai o post?"));
  assert.ok(mentionsAssistant("oi @Bunker"));
  assert.ok(!mentionsAssistant("email@assistente.com"));
  assert.ok(!mentionsAssistant("o assistente disse"));
});

test("histórico alterna papéis, junta seguidos e ignora apagadas", () => {
  const out = toModelMessages([
    m("1", "assistente", null, "olá antes"),
    m("2", "usuario", "Paula", "oi"),
    m("3", "usuario", "Glauber", "tudo bem?"),
    m("4", "usuario", "Paula", "apagada", true),
    m("5", "assistente", null, "Tudo!"),
    m("6", "usuario", "Paula", "@assistente e o post?"),
  ]);
  assert.deepEqual(out.map((o) => o.role), ["user", "assistant", "user"]);
  assert.equal(out[0]!.content, "Paula: oi\nGlauber: tudo bem?");
});

test("prompt de cliente avisa que o cliente lê a resposta", () => {
  const p = systemPrompt({ today: "2026-11-18", asker: { name: "Paula", isStaff: false }, audience: "cliente", knowledge: [{ title: "A", content: "B" }], facts: ["Projeto X"] });
  assert.match(p, /CLIENTE/);
  assert.match(p, /### A\nB/);
  assert.match(p, /- Projeto X/);
});
