import Link from "next/link";
import { currentStage, progressOf } from "@/lib/go-there/progress";
import type { FileRequest, PortalProject, Stage } from "@/lib/go-there/types";
import { Bridge, Tile, Widget, WidgetGroup } from "../ui";
import { NewProjectForm } from "./forms";
import { PROJECT_STATUS, ProgressBar } from "./portal";

type Row = PortalProject & { project_stages: Pick<Stage, "status" | "position">[]; file_requests: Pick<FileRequest, "status">[] };

export function ProjectsOverview({
  projects,
  isStaff,
  clients,
}: {
  projects: Row[];
  isStaff: boolean;
  clients: { id: string; name: string; trade_name: string | null }[];
}) {
  const active = projects.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const closed = projects.filter((p) => p.status === "concluido" || p.status === "cancelado");

  const card = (p: Row) => {
    const progress = progressOf(p.project_stages);
    const cur = currentStage(p.project_stages);
    const open = p.file_requests.filter((r) => r.status === "aberto").length;
    const st = PROJECT_STATUS[p.status];
    return (
      <li key={p.id}>
        <Link href={`/go-there/${p.id}`} className="widget flex h-full flex-col gap-3 p-4 transition hover:-translate-y-0.5">
          <div className="flex items-start gap-3">
            <Tile tint="purple" size="md">🛰️</Tile>
            <div className="min-w-0 flex-1">
              {isStaff && <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{p.client?.trade_name || p.client?.name}</p>}
              <p className="truncate text-lg font-bold">{p.name}</p>
            </div>
            <span className={`pill ${st.cls}`}>{st.label}</span>
          </div>
          <ProgressBar value={progress} />
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-muted">
              {p.project_stages.length === 0 ? "Sem etapas" : cur ? `${p.project_stages.filter((s) => s.status === "concluida").length} de ${p.project_stages.length} etapas` : "Etapas concluídas"}
            </span>
            <span className="font-semibold">{progress}%</span>
          </div>
          {open > 0 && <span className="pill w-fit bg-tint-yellow text-[#8a6d00]">{open} pedido{open > 1 ? "s" : ""} aguardando</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <Widget className="flex flex-wrap items-center gap-4 p-3 pr-5">
        <Tile tint="purple" size="lg">🛰️</Tile>
        <div className="min-w-48 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">GO THERE</h1>
          <p className="text-sm text-muted">{isStaff ? "Portal de acompanhamento dos clientes" : "Acompanhe seus projetos com a GO Bunker!"}</p>
        </div>
        <span className="pill bg-tile text-muted">{active.length} ativo{active.length === 1 ? "" : "s"}</span>
      </Widget>

      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {active.map(card)}
        {active.length === 0 && (
          <li className="widget p-6 text-center text-sm text-muted md:col-span-2 xl:col-span-3">
            {isStaff ? "Nenhum projeto ativo. Eles nascem quando um contrato é assinado, ou você cria abaixo." : "Nenhum projeto ativo no momento."}
          </li>
        )}
      </ul>

      {closed.length > 0 && (
        <details className="widget p-3">
          <summary className="cursor-pointer px-2 font-semibold">Concluídos e cancelados ({closed.length})</summary>
          <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{closed.map(card)}</ul>
        </details>
      )}

      {isStaff && (
        <WidgetGroup className="max-w-3xl">
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="blue" size="md">➕</Tile>
            <div>
              <h2 className="text-lg font-bold">Novo projeto</h2>
              <p className="text-sm text-muted">Para um cliente que já tem contrato.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5"><NewProjectForm clients={clients} /></div>
        </WidgetGroup>
      )}
    </div>
  );
}
