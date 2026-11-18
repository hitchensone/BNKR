import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ContractForm, type ContractDraft } from "@/components/go-cl/contract-form";
import { Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff } from "@/lib/data/session";
import { getLead } from "@/lib/data/leads";
import { getBriefingByLead } from "@/lib/data/contracts";
import { scopeFromBriefing } from "@/lib/go-cl/render";
import { saveContractAction } from "../../contratos/actions";

export default async function NewContractPage({ params }: PageProps<"/go-cl/[id]/contrato">) {
  await requireStaff();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const lead = await getLead(id).catch(() => null);
  if (!lead) notFound();
  const briefing = await getBriefingByLead(id);

  const draft: ContractDraft = {
    title: `Comunicação e marketing · ${lead.company_name}`,
    party_name: lead.company_name,
    party_document: null,
    party_address: null,
    party_representative: lead.contact_name,
    billing_type: "mensal",
    monthly_value: lead.estimated_value,
    one_time_value: null,
    payment_day: 10,
    start_date: briefing?.deadline ?? null,
    duration_months: 12,
    scope: briefing ? scopeFromBriefing(briefing) : "",
    extra_clauses: null,
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <WidgetGroup row className="w-full">
        <Link href={`/go-cl/${lead.id}`} aria-label="Voltar ao lead" className="widget grid place-items-center p-3">
          <span className="tile size-12 text-lg">←</span>
        </Link>
        <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
        <div className="widget flex min-w-0 flex-1 items-center gap-4 p-3 pr-5">
          <Tile tint="green" size="lg">✍️</Tile>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Novo contrato</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{lead.company_name}</h1>
          </div>
        </div>
      </WidgetGroup>

      {(!briefing || briefing.status !== "validado") && (
        <Widget className="flex items-center gap-4 p-3 pr-5">
          <Tile tint="yellow" size="md">⚠️</Tile>
          <p className="text-sm">
            {briefing
              ? "O briefing ainda está em rascunho. Dá pra gerar o contrato, mas o ideal é validar o briefing com o cliente antes."
              : "Este lead ainda não tem briefing, então o escopo está vazio. "}
            {!briefing && <Link href={`/go-cl/${lead.id}/briefing`} className="font-semibold text-primary">Fazer o briefing</Link>}
          </p>
        </Widget>
      )}

      <ContractForm draft={draft} action={saveContractAction} leadId={lead.id} briefingId={briefing?.id ?? null} />
    </div>
  );
}
