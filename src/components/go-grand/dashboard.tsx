import Link from "next/link";
import type { GrandFormState } from "@/app/(sistema)/go-grand/actions";
import { category } from "@/lib/go-grand/categories";
import type { RecurringItem, Transaction } from "@/lib/go-grand/types";
import {
  byCategory, monthLabel, monthOf, monthlySeries, recurringTotals, shiftMonth, statusOf, summarizeMonth, variation,
  type Month,
} from "@/lib/go-grand/summary";
import { Bridge, Tile, Widget, WidgetGroup, type Tint } from "../ui";
import { MonthChart } from "./month-chart";
import { TransactionForm } from "./forms";
import { Icon3D } from "@/components/icon3d";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const day = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Kpi({ icon, tint, label, value, note }: { icon: string; tint: Tint; label: string; value: number; note?: React.ReactNode }) {
  return (
    <Widget className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:pr-4">
      <Tile tint={tint} size="md" className="size-10 text-lg sm:size-12 sm:text-xl">{icon}</Tile>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted sm:text-xs">{label}</p>
        <p className="text-base font-bold tabular-nums sm:text-lg">{brl.format(value)}</p>
        {note && <p className="text-xs text-muted">{note}</p>}
      </div>
    </Widget>
  );
}

function Trend({ pct, inverse }: { pct: number | null; inverse?: boolean }) {
  if (pct == null) return <>sem base no mês anterior</>;
  const good = inverse ? pct <= 0 : pct >= 0;
  return (
    <span className={good ? "text-ok" : "text-accent"}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toLocaleString("pt-BR")}% vs mês anterior
    </span>
  );
}

export function GrandDashboard({
  month,
  today,
  transactions,
  recurring,
  addAction,
  toggleAction,
  removeAction,
}: {
  month: Month;
  today: string;
  transactions: Transaction[];
  recurring: RecurringItem[];
  addAction: (s: GrandFormState, f: FormData) => Promise<GrandFormState>;
  toggleAction: (f: FormData) => void | Promise<void>;
  removeAction: (f: FormData) => void | Promise<void>;
}) {
  const s = summarizeMonth(transactions, month, today);
  const prev = summarizeMonth(transactions, shiftMonth(month, -1), today);
  const series = monthlySeries(transactions, month, 6);
  const avgReceita = series.reduce((a, p) => a + p.entradas, 0) / series.length;
  const rec = recurringTotals(recurring, today);
  const saidasCat = byCategory(transactions, month, "saida");
  const maxCat = Math.max(1, ...saidasCat.map((c) => c.total));
  const monthTx = transactions.filter((t) => monthOf(t.due_date) === month);
  const isCurrent = monthOf(today) === month;

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap gap-6">
        <Widget className="flex min-w-72 flex-1 flex-wrap items-center gap-4 p-3 pr-4">
          <Tile tint="yellow" size="lg">💰</Tile>
          <div className="min-w-40 flex-1">
            <h1 className="text-xl font-bold tracking-tight">GO GRAND</h1>
            <p className="text-sm text-muted">Financeiro da agência</p>
          </div>
          <Link href="/go-grand/recorrentes" className="btn btn-soft h-10 px-4 text-sm"><Icon3D e="🔁" /> Recorrentes</Link>
        </Widget>
        <Widget className="flex w-full items-center justify-between gap-2 p-3 sm:w-auto">
          <Link href={`/go-grand?mes=${shiftMonth(month, -1)}`} aria-label="Mês anterior" className="tile size-11">←</Link>
          <div className="min-w-40 px-2 text-center">
            <p className="font-bold">{monthLabel(month)}</p>
            {!isCurrent && <Link href="/go-grand" className="text-xs font-semibold text-primary">Voltar para hoje</Link>}
          </div>
          <Link href={`/go-grand?mes=${shiftMonth(month, 1)}`} aria-label="Próximo mês" className="tile size-11">→</Link>
        </Widget>
      </div>

      {/* Indicadores do mês */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <Kpi icon="↓" tint="blue" label="Receitas" value={s.receitas} note={<Trend pct={variation(s.receitas, prev.receitas)} />} />
        <Kpi icon="↑" tint="orange" label="Despesas" value={s.despesas} note={<Trend pct={variation(s.despesas, prev.despesas)} inverse />} />
        <Kpi icon={s.resultado >= 0 ? "📈" : "📉"} tint={s.resultado >= 0 ? "green" : "red"} label="Resultado" value={s.resultado}
          note={s.receitas ? `Margem de ${Math.round((s.resultado / s.receitas) * 100)}%` : "Receitas pagas − despesas pagas"} />
        <Kpi icon="⏳" tint="purple" label="A receber" value={s.aReceber}
          note={s.vencidosReceber ? <span className="text-accent"><Icon3D e="⚠" /> {brl.format(s.vencidosReceber)} vencido</span> : "Nada vencido"} />
        <Kpi icon="🧾" tint="yellow" label="A pagar" value={s.aPagar}
          note={s.vencidosPagar ? <span className="text-accent"><Icon3D e="⚠" /> {brl.format(s.vencidosPagar)} vencido</span> : "Nada vencido"} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi icon="🔁" tint="blue" label="Receita recorrente" value={rec.mrr} note="Contratos mensais ativos" />
        <Kpi icon="🧩" tint="purple" label="Gastos fixos" value={rec.fixos} note="Plataformas, IAs e assinaturas" />
        <Kpi icon="📊" tint="green" label="Média de entradas" value={Math.round(avgReceita * 100) / 100} note="Últimos 6 meses" />
        <Kpi icon="💻" tint="orange" label="Margem em tecnologia" value={s.margemTecnologia} note="Vendas − compras de produtos" />
      </div>

      {/* Gráfico + categorias */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="blue" size="md">📊</Tile>
            <div>
              <h2 className="text-lg font-bold">Entradas x saídas</h2>
              <p className="text-sm text-muted">Últimos 6 meses</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5"><MonthChart data={series} current={month} /></div>
        </WidgetGroup>

        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="orange" size="md">🗂️</Tile>
            <div>
              <h2 className="text-lg font-bold">Para onde foi o dinheiro</h2>
              <p className="text-sm text-muted">Saídas de {monthLabel(month).toLowerCase()} por categoria</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <ul className="widget flex flex-col gap-3 p-5">
            {saidasCat.map(({ category: c, total }) => (
              <li key={c.id} className="flex items-center gap-3">
                <Tile tint={c.tint} size="sm">{c.icon}</Tile>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{c.label}</span>
                    <span className="font-semibold tabular-nums">{brl.format(total)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-tile">
                    <div className="h-2 rounded-full" style={{ width: `${(total / maxCat) * 100}%`, background: "#ff5a36" }} />
                  </div>
                </div>
              </li>
            ))}
            {saidasCat.length === 0 && <li className="p-4 text-center text-sm text-muted">Nenhuma saída neste mês.</li>}
          </ul>
        </WidgetGroup>
      </div>

      {/* Lançamentos */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <WidgetGroup>
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="green" size="md">📒</Tile>
            <div>
              <h2 className="text-lg font-bold">Lançamentos de {monthLabel(month).toLowerCase()}</h2>
              <p className="text-sm text-muted">{monthTx.length} lançamento{monthTx.length === 1 ? "" : "s"} · caixa do mês {brl.format(s.caixa)}</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <ul className="widget flex flex-col gap-1 p-2">
            {monthTx.map((t) => {
              const c = category(t.category);
              const st = statusOf(t, today);
              const manual = !t.recurring_id && !t.contract_id;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-[1.5rem] p-2 transition hover:bg-tile/50">
                  <Tile tint={c.tint} size="md">{c.icon}</Tile>
                  <div className="min-w-40 flex-1">
                    <p className="truncate font-semibold">{t.description}</p>
                    <p className="truncate text-xs text-muted">
                      {c.label} · vence {day(t.due_date)}{t.recurring_id ? " · recorrente" : ""}{!c.operational ? " · não operacional" : ""}
                    </p>
                  </div>
                  <p className="font-bold tabular-nums">{t.kind === "entrada" ? "+" : "−"} {brl.format(t.amount)}</p>
                  <span className={`pill ${st === "pago" ? "bg-tint-green text-ok" : st === "vencido" ? "bg-tint-red text-accent" : "bg-tile text-muted"}`}>
                    {st === "pago" ? (t.kind === "entrada" ? "✓ Recebido" : "✓ Pago") : st === "vencido" ? "⚠ Vencido" : "Previsto"}
                  </span>
                  <form action={toggleAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="paid" value={t.paid_at ? "0" : "1"} />
                    <button className={`btn h-9 px-3 text-xs ${t.paid_at ? "btn-soft" : "btn-primary"}`}>
                      {t.paid_at ? "Desfazer" : t.kind === "entrada" ? "Recebi" : "Paguei"}
                    </button>
                  </form>
                  {manual && (
                    <form action={removeAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <button aria-label={`Excluir ${t.description}`} className="tile size-9 text-xs text-muted hover:bg-tint-red hover:text-accent">✕</button>
                    </form>
                  )}
                </li>
              );
            })}
            {monthTx.length === 0 && <li className="p-6 text-center text-sm text-muted">Nenhum lançamento neste mês.</li>}
          </ul>
        </WidgetGroup>

        <WidgetGroup className="h-fit">
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="blue" size="md">➕</Tile>
            <div>
              <h2 className="text-lg font-bold">Novo lançamento</h2>
              <p className="text-sm text-muted">Venda, compra, gasto, aporte ou retirada.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5">
            <TransactionForm action={addAction} defaultDate={isCurrent ? today : `${month}-01`} />
          </div>
        </WidgetGroup>
      </div>
    </div>
  );
}
