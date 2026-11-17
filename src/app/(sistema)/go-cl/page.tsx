import { requireStaff } from "@/lib/data/session";
import { listLeads } from "@/lib/data/leads";
import { LEAD_STAGES, OPEN_STAGES } from "@/lib/go-cl/stages";
import { formatBRL } from "@/lib/go-cl/render";
import { changeStage } from "./actions";
import { NewLeadForm } from "./new-lead";

export default async function GoClPage() {
  await requireStaff();
  const leads = await listLeads();

  const open = leads.filter((l) => l.stage !== "ganho" && l.stage !== "perdido");
  const pipeline = open.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);
  const won = leads.filter((l) => l.stage === "ganho").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">GO CL</h1>
          <p className="text-sm text-muted">Captação de leads, do primeiro contato ao contrato.</p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div><dt className="text-muted">Em aberto</dt><dd className="text-lg font-semibold">{open.length}</dd></div>
          <div><dt className="text-muted">Potencial mensal</dt><dd className="text-lg font-semibold">{formatBRL(pipeline)}</dd></div>
          <div><dt className="text-muted">Ganhos</dt><dd className="text-lg font-semibold">{won}</dd></div>
        </dl>
      </div>

      <NewLeadForm />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {OPEN_STAGES.map((stage) => {
          const items = leads.filter((l) => l.stage === stage.id);
          return (
            <section key={stage.id} className="w-72 shrink-0">
              <header className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="font-medium">{stage.label}</h2>
                <span className="text-xs text-muted">{stage.phase} · {items.length}</span>
              </header>
              <ul className="flex flex-col gap-2">
                {items.map((lead) => (
                  <li key={lead.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                    <p className="font-medium">{lead.company_name}</p>
                    <p className="text-muted">
                      {[lead.contact_name, lead.segment, lead.city].filter(Boolean).join(" · ") || "Sem detalhes"}
                    </p>
                    {lead.estimated_value != null && <p className="mt-1">{formatBRL(lead.estimated_value)}/mês</p>}
                    <form action={changeStage} className="mt-2 flex gap-2">
                      <input type="hidden" name="id" value={lead.id} />
                      <select name="stage" defaultValue={lead.stage} aria-label="Etapa"
                        className="flex-1 rounded-md border border-border bg-background px-2 py-1">
                        {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <button className="rounded-md border border-border px-2 py-1">Mover</button>
                    </form>
                  </li>
                ))}
                {items.length === 0 && <li className="px-1 text-sm text-muted">Nenhum lead aqui.</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
