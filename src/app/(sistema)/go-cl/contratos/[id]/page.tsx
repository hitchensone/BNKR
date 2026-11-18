import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ContractDocument } from "@/components/go-cl/contract-document";
import { ContractForm } from "@/components/go-cl/contract-form";
import { ContractStatusPill, PrintButton, SignForm } from "@/components/go-cl/contract-bits";
import { Tile, Widget, WidgetGroup } from "@/components/ui";
import { requireStaff } from "@/lib/data/session";
import { getContract, getProjectFromContract, previewContract } from "@/lib/data/contracts";
import { formatBRL } from "@/lib/go-cl/render";
import { formatDateTime } from "@/components/go-cl/labels";
import { backToDraft, cancelContract, markSent, markSigned, saveContractAction } from "../actions";

export default async function ContractPage({ params, searchParams }: PageProps<"/go-cl/contratos/[id]">) {
  await requireStaff();
  const { id } = await params;
  const { editar } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const contract = await getContract(id).catch(() => null);
  if (!contract) notFound();

  const editing = editar === "1" && contract.status === "rascunho";
  const [body, project] = await Promise.all([
    previewContract(contract),
    contract.status === "assinado" ? getProjectFromContract(id) : Promise.resolve(null),
  ]);
  const blanks = (body.match(/(?<!_)_{4,9}(?!_)/g) ?? []).length;
  const back = contract.lead_id ? `/go-cl/${contract.lead_id}` : "/go-cl/contratos";

  return (
    <div className="flex flex-col gap-8">
      <div className="no-print flex flex-col gap-8">
        <WidgetGroup row className="w-full">
          <Link href={back} aria-label="Voltar" className="widget grid place-items-center p-3">
            <span className="tile size-12 text-lg">←</span>
          </Link>
          <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
          <div className="widget flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-3 pr-5">
            <Tile tint="green" size="lg">📄</Tile>
            <div className="min-w-48 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Contrato {contract.number}</p>
              <h1 className="truncate text-2xl font-bold tracking-tight">{contract.title}</h1>
            </div>
            <ContractStatusPill status={contract.status} />
          </div>
        </WidgetGroup>

        {editing ? null : (
          <div className="flex flex-wrap gap-6">
            <Widget className="flex min-w-72 flex-1 flex-wrap items-center gap-x-8 gap-y-3 p-4 px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Contratante</p>
                <p className="font-semibold">{contract.party_name}</p>
              </div>
              {contract.monthly_value != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Mensal</p>
                  <p className="font-semibold">{formatBRL(contract.monthly_value)}</p>
                </div>
              )}
              {contract.one_time_value != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Valor único</p>
                  <p className="font-semibold">{formatBRL(contract.one_time_value)}</p>
                </div>
              )}
              {contract.duration_months && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">Vigência</p>
                  <p className="font-semibold">{contract.duration_months} meses</p>
                </div>
              )}
            </Widget>

            <Widget className="flex w-full flex-wrap items-center gap-2 p-3 sm:w-auto">
              <PrintButton />
              {contract.status === "rascunho" && (
                <>
                  <Link href={`/go-cl/contratos/${id}?editar=1`} className="btn btn-soft h-11 px-4 text-sm">✏️ Editar</Link>
                  <form action={markSent}>
                    <input type="hidden" name="id" value={id} />
                    <button className="btn btn-primary h-11 px-4 text-sm">Marcar como enviado</button>
                  </form>
                </>
              )}
              {contract.status === "enviado" && (
                <form action={backToDraft}>
                  <input type="hidden" name="id" value={id} />
                  <button className="btn btn-soft h-11 px-4 text-sm">Voltar para rascunho</button>
                </form>
              )}
              {(contract.status === "rascunho" || contract.status === "enviado") && (
                <form action={cancelContract}>
                  <input type="hidden" name="id" value={id} />
                  <button className="btn h-11 px-4 text-sm text-accent hover:bg-tint-red">Cancelar</button>
                </form>
              )}
            </Widget>
          </div>
        )}

        {!editing && blanks > 0 && contract.status !== "assinado" && (
          <Widget className="flex items-center gap-4 p-3 pr-5">
            <Tile tint="red" size="md">⚠️</Tile>
            <p className="text-sm">
              O contrato tem {blanks} campo{blanks === 1 ? "" : "s"} sem dado, marcado{blanks === 1 ? "" : "s"} em vermelho no texto.
              {contract.status === "rascunho" ? " Edite o contrato ou complete os dados da agência antes de enviar." : ""}
            </p>
          </Widget>
        )}

        {contract.status === "enviado" && (
          <WidgetGroup className="max-w-xl">
            <div className="widget flex items-center gap-4 p-3">
              <Tile tint="green" size="md">✍️</Tile>
              <div>
                <h2 className="text-lg font-bold">Assinatura</h2>
                <p className="text-sm text-muted">
                  Enviado em {contract.sent_at ? formatDateTime(contract.sent_at) : "—"}. Registre quando o cliente assinar.
                </p>
              </div>
            </div>
            <div className="bridge" aria-hidden style={{ alignSelf: "flex-start", marginLeft: "3.5rem" }} />
            <div className="widget p-5">
              <SignForm contractId={id} defaultName={contract.party_representative ?? contract.party_name} action={markSigned} />
            </div>
          </WidgetGroup>
        )}

        {contract.status === "assinado" && (
          <Widget className="flex flex-wrap items-center gap-4 p-3 pr-5">
            <Tile tint="green" size="lg">🎉</Tile>
            <div className="min-w-48 flex-1">
              <p className="font-bold">
                Assinado por {contract.signed_by_name}{contract.signed_at ? ` em ${formatDateTime(contract.signed_at)}` : ""}
              </p>
              <p className="text-sm text-muted">
                Cliente cadastrado{project ? `, projeto "${project.name}" criado` : ""} e valores lançados para o financeiro.
              </p>
            </div>
          </Widget>
        )}
      </div>

      {editing ? (
        <div className="mx-auto w-full max-w-4xl">
          <ContractForm draft={contract} action={saveContractAction} contractId={id} leadId={contract.lead_id ?? undefined} />
        </div>
      ) : (
        <div className="widget print-sheet mx-auto w-full max-w-[52rem] p-6 sm:p-12">
          <ContractDocument body={body} />
        </div>
      )}
    </div>
  );
}
