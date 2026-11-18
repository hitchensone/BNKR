import { test } from "node:test";
import assert from "node:assert/strict";
import { byCategory, monthRange, monthlySeries, recurringTotals, shiftMonth, statusOf, summarizeMonth, variation } from "./summary.ts";
import type { RecurringItem, Transaction } from "./types.ts";

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(), kind: "entrada", category: "contrato_mensal", description: "", amount: 0,
  due_date: "2026-11-10", paid_at: null, payment_method: null, client_id: null, contract_id: null,
  recurring_id: null, notes: null, ...p,
});

const data = [
  tx({ amount: 1500, paid_at: "2026-11-10" }),
  tx({ amount: 2800, due_date: "2026-11-05" }), // vencido
  tx({ amount: 3000, category: "venda_tecnologia", paid_at: "2026-11-12" }),
  tx({ kind: "saida", category: "compra_tecnologia", amount: 2200, paid_at: "2026-11-08" }),
  tx({ kind: "saida", category: "ia", amount: 110, paid_at: "2026-11-05" }),
  tx({ kind: "saida", category: "retirada", amount: 1000, paid_at: "2026-11-20" }),
  tx({ kind: "entrada", category: "aporte", amount: 5000, paid_at: "2026-11-01" }),
  tx({ amount: 1500, due_date: "2026-10-10", paid_at: "2026-10-10" }),
];

test("resumo do mês separa operacional de aporte/retirada", () => {
  const s = summarizeMonth(data, "2026-11", "2026-11-18");
  assert.equal(s.receitas, 4500);
  assert.equal(s.despesas, 2310);
  assert.equal(s.resultado, 2190);
  assert.equal(s.aReceber, 2800);
  assert.equal(s.vencidosReceber, 2800);
  assert.equal(s.aportes, 5000);
  assert.equal(s.retiradas, 1000);
  assert.equal(s.caixa, 4500 + 5000 - 2310 - 1000);
  assert.equal(s.margemTecnologia, 800);
});

test("série mensal ignora aporte e retirada", () => {
  const s = monthlySeries(data, "2026-11", 2);
  assert.deepEqual(s.map((p) => p.month), ["2026-10", "2026-11"]);
  assert.equal(s[1].entradas, 1500 + 2800 + 3000);
  assert.equal(s[1].saidas, 2310);
  assert.equal(s[0].entradas, 1500);
});

test("categorias, status, meses e variação", () => {
  assert.equal(byCategory(data, "2026-11", "saida")[0].category.id, "compra_tecnologia");
  assert.equal(statusOf(data[1], "2026-11-18"), "vencido");
  assert.equal(statusOf(data[0], "2026-11-18"), "pago");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.deepEqual(monthRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
  assert.equal(variation(150, 100), 50);
  assert.equal(variation(10, 0), null);
});

test("recorrentes ativos", () => {
  const r = (p: Partial<RecurringItem>): RecurringItem => ({ id: "x", kind: "entrada", category: "contrato_mensal", description: "", amount: 1000, day_of_month: 10, start_date: "2026-01-01", end_date: null, contract_id: null, active: true, notes: null, ...p });
  const t = recurringTotals([r({}), r({ end_date: "2026-06-30" }), r({ kind: "saida", category: "ia", amount: 110 })], "2026-11-18");
  assert.deepEqual(t, { mrr: 1000, fixos: 110 });
});
