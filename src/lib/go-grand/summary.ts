import { category } from "./categories.ts";
import type { RecurringItem, Transaction } from "./types.ts";

// Cálculos do painel financeiro. Funções puras: recebem os lançamentos
// e devolvem os números, para serem testadas sem banco.

export type Month = string; // "YYYY-MM"

export const monthOf = (date: string): Month => date.slice(0, 7);

export function shiftMonth(month: Month, delta: number): Month {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Primeiro e último dia do mês, como YYYY-MM-DD. */
export function monthRange(month: Month) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export function monthLabel(month: Month, style: "long" | "short" = "long") {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 15));
  const name = d.toLocaleDateString("pt-BR", { month: style, timeZone: "UTC" }).replace(".", "");
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  return style === "long" ? `${cap} de ${y}` : cap;
}

const sum = (list: Transaction[]) => Math.round(list.reduce((s, t) => s + Number(t.amount), 0) * 100) / 100;
const op = (t: Transaction) => category(t.category).operational;

export type TxStatus = "pago" | "previsto" | "vencido";
export function statusOf(t: Transaction, today: string): TxStatus {
  if (t.paid_at) return "pago";
  return t.due_date < today ? "vencido" : "previsto";
}

export interface MonthSummary {
  receitas: number;      // entradas operacionais pagas
  despesas: number;      // saídas operacionais pagas
  resultado: number;     // receitas - despesas
  aReceber: number;      // entradas do mês ainda não pagas
  aPagar: number;        // saídas do mês ainda não pagas
  vencidosReceber: number;
  vencidosPagar: number;
  aportes: number;
  retiradas: number;
  caixa: number;         // tudo que entrou - tudo que saiu (pago), inclusive aporte/retirada
  margemTecnologia: number; // vendas de tecnologia - compras de produtos (pagas)
}

export function summarizeMonth(all: Transaction[], month: Month, today: string): MonthSummary {
  const tx = all.filter((t) => monthOf(t.due_date) === month);
  const paid = tx.filter((t) => t.paid_at);
  const open = tx.filter((t) => !t.paid_at);
  const of = (list: Transaction[], kind: string, filter: (t: Transaction) => boolean = () => true) =>
    sum(list.filter((t) => t.kind === kind && filter(t)));

  const receitas = of(paid, "entrada", op);
  const despesas = of(paid, "saida", op);
  return {
    receitas,
    despesas,
    resultado: Math.round((receitas - despesas) * 100) / 100,
    aReceber: of(open, "entrada"),
    aPagar: of(open, "saida"),
    vencidosReceber: of(open, "entrada", (t) => t.due_date < today),
    vencidosPagar: of(open, "saida", (t) => t.due_date < today),
    aportes: of(paid, "entrada", (t) => t.category === "aporte"),
    retiradas: of(paid, "saida", (t) => t.category === "retirada"),
    caixa: Math.round((of(paid, "entrada") - of(paid, "saida")) * 100) / 100,
    margemTecnologia: Math.round(
      (of(paid, "entrada", (t) => t.category === "venda_tecnologia") - of(paid, "saida", (t) => t.category === "compra_tecnologia")) * 100,
    ) / 100,
  };
}

export interface MonthPoint {
  month: Month;
  entradas: number; // operacionais, pelo vencimento (pagas + previstas)
  saidas: number;
}

/** Entradas e saídas operacionais por mês, pelo vencimento. */
export function monthlySeries(all: Transaction[], lastMonth: Month, count: number): MonthPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(lastMonth, i - count + 1);
    const tx = all.filter((t) => monthOf(t.due_date) === month && op(t));
    return {
      month,
      entradas: sum(tx.filter((t) => t.kind === "entrada")),
      saidas: sum(tx.filter((t) => t.kind === "saida")),
    };
  });
}

/** Totais por categoria de um tipo, do maior para o menor. */
export function byCategory(all: Transaction[], month: Month, kind: "entrada" | "saida") {
  const totals = new Map<string, number>();
  for (const t of all) {
    if (t.kind !== kind || monthOf(t.due_date) !== month) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + Number(t.amount));
  }
  return [...totals.entries()]
    .map(([id, total]) => ({ category: category(id), total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

/** Receita recorrente mensal (MRR) e gastos fixos ativos numa data. */
export function recurringTotals(items: RecurringItem[], today: string) {
  const active = items.filter((r) => r.active && r.start_date <= today && (!r.end_date || r.end_date >= today));
  const of = (kind: string, operational: boolean) =>
    Math.round(active.filter((r) => r.kind === kind && category(r.category).operational === operational)
      .reduce((s, r) => s + Number(r.amount), 0) * 100) / 100;
  return { mrr: of("entrada", true), fixos: of("saida", true) };
}

/** Variação percentual entre dois valores (null quando não há base). */
export function variation(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
