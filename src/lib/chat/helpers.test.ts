import { test } from "node:test";
import assert from "node:assert/strict";
import { dayLabel, groupMessages, linkify, listTime, upsertMessage, type ChatMessage } from "./helpers.ts";

const msg = (id: string, author: string | null, at: string, kind: ChatMessage["kind"] = "usuario"): ChatMessage => ({
  id, channel_id: "c", author_id: author, author_name: author, kind, body: id, edited_at: null, deleted_at: null, created_at: at,
});

test("agrupa por dia (Brasília) e marca início de sequência", () => {
  const groups = groupMessages([
    msg("a", "u1", "2026-11-18T02:30:00Z"), // 17/11 23:30 em Brasília
    msg("b", "u1", "2026-11-18T12:00:00Z"),
    msg("c", "u1", "2026-11-18T12:03:00Z"),
    msg("d", "u2", "2026-11-18T12:04:00Z"),
    msg("e", "u2", "2026-11-18T12:20:00Z"),
    msg("f", null, "2026-11-18T12:21:00Z", "assistente"),
  ]);
  assert.deepEqual(groups.map((g) => g.day), ["2026-11-17", "2026-11-18"]);
  assert.deepEqual(groups[1]!.items.map((m) => m.first), [true, false, true, true, true]);
});

test("rótulos de dia e horário da lista", () => {
  assert.equal(dayLabel("2026-11-18", "2026-11-18"), "Hoje");
  assert.equal(dayLabel("2026-11-17", "2026-11-18"), "Ontem");
  assert.equal(dayLabel("2026-12-05", "2026-11-18"), "5 de dezembro");
  assert.equal(listTime("2026-11-18T15:07:00Z", "2026-11-18"), "12:07");
  assert.equal(listTime("2026-11-10T15:07:00Z", "2026-11-18"), "10/11");
});

test("upsert não duplica e mantém a ordem", () => {
  let list = [msg("a", "u", "2026-11-18T10:00:00Z")];
  list = upsertMessage(list, msg("a", "u", "2026-11-18T10:00:00Z"));
  list = upsertMessage(list, msg("c", "u", "2026-11-18T12:00:00Z"));
  list = upsertMessage(list, msg("b", "u", "2026-11-18T11:00:00Z"));
  assert.deepEqual(list.map((m) => m.id), ["a", "b", "c"]);
});

test("links viram partes clicáveis sem a pontuação final", () => {
  const parts = linkify("veja https://go.bunker/x?a=1. ok");
  assert.deepEqual(parts, [{ text: "veja " }, { text: "https://go.bunker/x?a=1", href: "https://go.bunker/x?a=1" }, { text: ". ok" }]);
});
