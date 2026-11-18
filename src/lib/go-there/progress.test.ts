import { test } from "node:test";
import assert from "node:assert/strict";
import { currentStage, formatBytes, progressOf, safeFileName } from "./progress.ts";

test("progresso e etapa atual", () => {
  const st = [
    { status: "concluida" as const, position: 0 },
    { status: "em_andamento" as const, position: 1 },
    { status: "pendente" as const, position: 2 },
    { status: "pendente" as const, position: 3 },
  ];
  assert.equal(progressOf(st), 38);
  assert.equal(currentStage(st)?.position, 1);
  assert.equal(progressOf([]), 0);
});

test("nome de arquivo seguro e tamanho", () => {
  assert.equal(safeFileName("Logo Clínica Sorriso (final).ai"), "Logo-Clinica-Sorriso-final-.ai");
  assert.equal(safeFileName("../../etc/passwd"), "..-..-etc-passwd");
  assert.equal(formatBytes(2_500_000), "2,4 MB");
});
