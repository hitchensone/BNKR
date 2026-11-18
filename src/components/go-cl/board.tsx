import Link from "next/link";
import type { Lead } from "@/lib/types";
import { LEAD_STAGES, OPEN_STAGES } from "@/lib/go-cl/stages";
import { Bridge, Stat, Tile, Widget, WidgetGroup, type Tint } from "../ui";
import { Icon3D } from "@/components/icon3d";

const temperature: Record<Lead["temperature"], { icon: string; tint: Tint; label: string }> = {
  quente: { icon: "🔥", tint: "red", label: "Quente" },
  morno: { icon: "🌤️", tint: "yellow", label: "Morno" },
  frio: { icon: "❄️", tint: "blue", label: "Frio" },
};

const compactFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const plainFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const compactBRL = { format: (v: number) => (Math.abs(v) >= 1000 ? compactFmt.format(v) : plainFmt.format(v)) };

const phaseTint: Record<string, Tint> = {
  Atrair: "orange",
  Cativar: "yellow",
  Estruturar: "purple",
  Fechar: "green",
};

/**
 * Quadro do funil. Recebe a ação de mover como prop para o mesmo
 * componente servir na tela real e na pré-visualização.
 */
export function LeadBoard({
  leads,
  moveAction,
  newLeadForm,
}: {
  leads: Lead[];
  moveAction: (formData: FormData) => void | Promise<void>;
  newLeadForm: React.ReactNode;
}) {
  const open = leads.filter((l) => l.stage !== "ganho" && l.stage !== "perdido");
  const pipeline = open.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const won = leads.filter((l) => l.stage === "ganho").length;
  const hot = open.filter((l) => l.temperature === "quente").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-4">
        <Widget className="flex min-w-0 flex-1 items-center gap-3.5 p-3 pr-3 sm:min-w-72 sm:pr-4">
          <Tile tint="red" size="lg">🎯</Tile>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">GO CL</h1>
            <p className="truncate text-sm text-muted">Captação de leads, do primeiro contato ao contrato.</p>
          </div>
          <Link href="/go-cl/contratos" aria-label="Contratos" className="btn btn-soft ml-auto h-10 shrink-0 px-3 text-sm sm:px-4"><Icon3D e="📄" /><span className="hidden sm:inline">Contratos</span></Link>
        </Widget>
        <Widget className="grid w-full grid-cols-2 items-center gap-x-6 gap-y-3 p-3 px-5 sm:flex sm:w-auto sm:flex-wrap sm:gap-x-7">
          <Stat icon="📇" tint="blue" value={open.length} label="Em aberto" />
          <Stat icon="🔥" tint="red" value={hot} label="Quentes" />
          <Stat icon="💸" tint="green" value={compactBRL.format(pipeline)} label="Potencial/mês" />
          <Stat icon="🏆" tint="yellow" value={won} label="Ganhos" />
        </Widget>
      </div>

      {newLeadForm}

      {/* As colunas dividem a largura toda (alinham com os blocos de cima); rolam só se faltar espaço */}
      <div className="-mx-3 -mb-6 grid auto-cols-[minmax(13rem,1fr)] grid-flow-col gap-4 overflow-x-auto px-3 pb-10">
        {OPEN_STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          return (
            <WidgetGroup key={stage.id} className="min-w-0">
              <div className="widget flex items-center gap-2.5 p-2.5">
                <Tile tint={phaseTint[stage.phase]} size="sm" className="text-sm font-bold text-foreground">
                  {String(items.length)}
                </Tile>
                <div className="min-w-0 leading-tight">
                  <h2 className="truncate font-bold">{stage.label}</h2>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{stage.phase}</p>
                </div>
              </div>
              <Bridge align="start" offset="2.25rem" size="1.75rem" />
              <ul className="widget flex flex-1 flex-col gap-1 p-1.5">
                {items.map((lead) => {
                  const t = temperature[lead.temperature];
                  return (
                    <li key={lead.id} className="rounded-[1.25rem] p-2 transition hover:bg-tile/60">
                      <div className="flex items-center gap-2.5">
                        <Tile tint={t.tint} size="sm"><Icon3D e={t.icon} title={t.label} /></Tile>
                        <div className="min-w-0 flex-1">
                          <Link href={`/go-cl/${lead.id}`} className="block truncate text-sm font-semibold hover:text-primary">{lead.company_name}</Link>
                          <p className="truncate text-xs text-muted">
                            {[lead.contact_name, lead.segment, lead.city].filter(Boolean).join(" · ") || "Sem detalhes"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        {lead.estimated_value != null && (
                          <span className="pill shrink-0 bg-tint-green px-2 text-ok">{compactBRL.format(lead.estimated_value)}</span>
                        )}
                        <form action={moveAction} className="flex min-w-0 flex-1 items-center justify-end gap-1">
                          <input type="hidden" name="id" value={lead.id} />
                          <select
                            name="stage"
                            defaultValue={lead.stage}
                            aria-label={`Etapa de ${lead.company_name}`}
                            className="h-7 min-w-0 max-w-[7rem] flex-1 rounded-lg bg-tile px-1.5 text-[11px] font-semibold text-foreground outline-none"
                          >
                            {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                          <button aria-label="Mover lead" className="btn btn-primary size-7 shrink-0 rounded-lg p-0 text-xs">→</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
                {items.length === 0 && (
                  <li className="px-2 py-5 text-center text-xs text-muted">Nenhum lead nesta etapa.</li>
                )}
              </ul>
            </WidgetGroup>
          );
        })}
      </div>
    </div>
  );
}
