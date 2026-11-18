import Link from "next/link";
import type { Lead } from "@/lib/types";
import { LEAD_STAGES, OPEN_STAGES } from "@/lib/go-cl/stages";
import { formatBRL } from "@/lib/go-cl/render";
import { Bridge, Stat, Tile, Widget, WidgetGroup, type Tint } from "../ui";

const temperature: Record<Lead["temperature"], { icon: string; tint: Tint; label: string }> = {
  quente: { icon: "🔥", tint: "red", label: "Quente" },
  morno: { icon: "🌤️", tint: "yellow", label: "Morno" },
  frio: { icon: "❄️", tint: "blue", label: "Frio" },
};

const compactBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-6">
        <Widget className="flex min-w-72 flex-1 items-center gap-4 p-3 pr-6">
          <Tile tint="red" size="lg">🎯</Tile>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">GO CL</h1>
            <p className="text-sm text-muted">Captação de leads, do primeiro contato ao contrato.</p>
          </div>
        </Widget>
        <Widget className="grid grid-cols-2 items-center gap-x-6 gap-y-4 p-4 px-5 sm:flex sm:flex-wrap sm:gap-x-8 sm:px-6">
          <Stat icon="📇" tint="blue" value={open.length} label="Em aberto" />
          <Stat icon="🔥" tint="red" value={hot} label="Quentes" />
          <Stat icon="💸" tint="green" value={compactBRL.format(pipeline)} label="Potencial/mês" />
          <Stat icon="🏆" tint="yellow" value={won} label="Ganhos" />
        </Widget>
      </div>

      {newLeadForm}

      <div className="-mx-4 flex gap-6 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6">
        {OPEN_STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          return (
            <WidgetGroup key={stage.id} className="w-[20rem] shrink-0">
              <div className="widget flex items-center gap-3 p-3">
                <Tile tint={phaseTint[stage.phase]} size="md" className="text-base font-bold text-foreground">
                  {items.length}
                </Tile>
                <div className="leading-tight">
                  <h2 className="text-lg font-bold">{stage.label}</h2>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">{stage.phase}</p>
                </div>
              </div>
              <Bridge align="start" offset="3.5rem" size="2rem" />
              <ul className="widget flex flex-col gap-1 p-2">
                {items.map((lead) => {
                  const t = temperature[lead.temperature];
                  return (
                    <li key={lead.id} className="rounded-[1.5rem] p-2 transition hover:bg-tile/60">
                      <div className="flex items-center gap-3">
                        <Tile tint={t.tint} size="md" className="text-lg"><span title={t.label}>{t.icon}</span></Tile>
                        <div className="min-w-0 flex-1">
                          <Link href={`/go-cl/${lead.id}`} className="block truncate font-semibold hover:text-primary">{lead.company_name}</Link>
                          <p className="truncate text-sm text-muted">
                            {[lead.contact_name, lead.segment, lead.city].filter(Boolean).join(" · ") || "Sem detalhes"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {lead.estimated_value != null && (
                          <span className="pill bg-tint-green text-[#3c8a2e]">{formatBRL(lead.estimated_value)}</span>
                        )}
                        <form action={moveAction} className="ml-auto flex items-center gap-1.5">
                          <input type="hidden" name="id" value={lead.id} />
                          <select
                            name="stage"
                            defaultValue={lead.stage}
                            aria-label={`Etapa de ${lead.company_name}`}
                            className="h-8 w-[6.75rem] rounded-xl bg-tile px-2 text-xs font-semibold text-foreground outline-none"
                          >
                            {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                          <button aria-label="Mover lead" className="btn btn-primary h-8 w-8 rounded-xl p-0 text-sm">→</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
                {items.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted">Nenhum lead nesta etapa.</li>
                )}
              </ul>
            </WidgetGroup>
          );
        })}
      </div>
    </div>
  );
}
