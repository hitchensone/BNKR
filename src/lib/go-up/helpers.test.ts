import { test } from "node:test";
import assert from "node:assert/strict";
import { dueBucket, initials, sortTasks } from "./helpers.ts";

test("faixas de prazo", () => {
  assert.equal(dueBucket("2026-11-17", "2026-11-18"), "atrasada");
  assert.equal(dueBucket("2026-11-18", "2026-11-18"), "hoje");
  assert.equal(dueBucket("2026-11-25", "2026-11-18"), "semana");
  assert.equal(dueBucket("2026-12-10", "2026-11-18"), "depois");
  assert.equal(dueBucket(null, "2026-11-18"), "sem_prazo");
});

test("ordenação e iniciais", () => {
  const s = sortTasks([
    { priority: "normal" as const, due_date: "2026-11-20", position: 0 },
    { priority: "urgente" as const, due_date: null, position: 1 },
    { priority: "normal" as const, due_date: "2026-11-19", position: 2 },
  ]);
  assert.deepEqual(s.map((t) => t.position), [1, 2, 0]);
  assert.equal(initials("Glauber Hitchens"), "GH");
  assert.equal(initials(null), "?");
});
