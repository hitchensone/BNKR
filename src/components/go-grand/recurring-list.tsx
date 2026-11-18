import Link from "next/link";
import type { GrandFormState } from "@/app/(sistema)/go-grand/actions";
import { category } from "@/lib/go-grand/categories";
import { recurringTotals } from "@/lib/go-grand/summary";
import type { RecurringItem } from "@/lib/go-grand/types";
import { Bridge, Tile, Widget, WidgetGroup } from "../ui";
import { RecurringForm } from "./forms";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const br = (iso: string) => iso.split("-").reverse().join("/");

export function RecurringList({
  items,
  today,
  addAction,
  stopAction,
}: {
  items: RecurringItem[];
  today: string;
  addAction: (s: GrandFormState, f: FormData) => Promise<GrandFormState>;
  stopAction: (f: FormData) => void | Promise<void>;
}) {
  const active = items.filter((r) => r.active);
  const ended = items.filter((r) => !r.active);
  const totals = recurringTotals(items, today);

  const row = (r: RecurringItem) => {
    const c = category(r.category);
    return (
      <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-[1.5rem] p-2 transition hover:bg-tile/50">
        <Tile tint={c.tint} size="md">{c.icon}</Tile>
        <div className="min-w-40 flex-1">
          <p className="truncate font-semibold">{r.description}</p>
          <p className="truncate text-xs text-muted">
            {c.label} · todo dia {r.day_of_month} · desde {br(r.start_date)}{r.end_date ? ` até ${br(r.end_date)}` : ""}
            {r.contract_id ? " · do contrato" : ""}
          </p>
        </div>
        <p className="font-bold tabular-nums">{r.kind === "entrada" ? "+" : "−"} {brl.format(r.amount)}/mês</p>
        {r.active && (
          <form action={stopAction}>
            <input type="hidden" name="id" value={r.id} />
            <button className="btn btn-soft h-9 px-3 text-xs">Encerrar hoje</button>
          </form>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-6">
        <Widget className="flex min-w-72 flex-1 items-center gap-4 p-3">
          <Link href="/go-grand" aria-label="Voltar ao financeiro" className="tile size-12 text-lg">←</Link>
          <Tile tint="yellow" size="lg">🔁</Tile>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recorrentes</h1>
            <p className="text-sm text-muted">Contratos mensais, plataformas, IAs e assinaturas</p>
          </div>
        </Widget>
        <Widget className="flex flex-wrap items-center gap-x-8 gap-y-2 p-4 px-6">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Entra por mês</p><p className="text-lg font-bold">{brl.format(totals.mrr)}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-muted">Sai por mês</p><p className="text-lg font-bold">{brl.format(totals.fixos)}</p></div>
        </Widget>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          <WidgetGroup>
            <div className="widget flex items-center gap-4 p-3">
              <Tile tint="green" size="md">✅</Tile>
              <div>
                <h2 className="text-lg font-bold">Ativas</h2>
                <p className="text-sm text-muted">Geram um lançamento por mês, até o mês seguinte.</p>
              </div>
            </div>
            <Bridge align="start" offset="3.5rem" />
            <ul className="widget flex flex-col gap-1 p-2">
              {active.map(row)}
              {active.length === 0 && <li className="p-6 text-center text-sm text-muted">Nenhuma recorrência ativa.</li>}
            </ul>
          </WidgetGroup>
          {ended.length > 0 && (
            <details className="widget p-3">
              <summary className="cursor-pointer px-2 font-semibold">Encerradas ({ended.length})</summary>
              <ul className="mt-2 flex flex-col gap-1 opacity-70">{ended.map(row)}</ul>
            </details>
          )}
        </div>

        <WidgetGroup className="h-fit">
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="blue" size="md">➕</Tile>
            <div>
              <h2 className="text-lg font-bold">Nova recorrência</h2>
              <p className="text-sm text-muted">Contratos assinados no GO CL entram sozinhos.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5"><RecurringForm action={addAction} defaultDate={today} /></div>
        </WidgetGroup>
      </div>
    </div>
  );
}
