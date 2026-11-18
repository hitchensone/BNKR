import Link from "next/link";
import { ContractStatusPill } from "@/components/go-cl/contract-bits";
import { Bridge, Tile, WidgetGroup } from "@/components/ui";
import { requireStaff } from "@/lib/data/session";
import { listContracts } from "@/lib/data/contracts";
import { formatBRL } from "@/lib/go-cl/render";

export default async function ContractsPage() {
  await requireStaff();
  const contracts = await listContracts();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <WidgetGroup>
        <div className="widget flex items-center gap-4 p-3">
          <Link href="/go-cl" aria-label="Voltar ao funil" className="tile size-12 text-lg">←</Link>
          <Tile tint="green" size="lg">📄</Tile>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Contratos</h1>
            <p className="text-sm text-muted">{contracts.length} no total</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <ul className="widget flex flex-col gap-1 p-2">
          {contracts.map((c) => (
            <li key={c.id}>
              <Link href={`/go-cl/contratos/${c.id}`} className="flex flex-wrap items-center gap-3 rounded-[1.5rem] p-3 transition hover:bg-tile/60">
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm text-muted">{c.number} · {c.party_name}</p>
                </div>
                {c.monthly_value != null && <span className="text-sm font-semibold">{formatBRL(c.monthly_value)}/mês</span>}
                <ContractStatusPill status={c.status} />
              </Link>
            </li>
          ))}
          {contracts.length === 0 && (
            <li className="p-6 text-center text-sm text-muted">Nenhum contrato ainda. Gere o primeiro a partir de um lead.</li>
          )}
        </ul>
      </WidgetGroup>
    </div>
  );
}
