"use client";

import { useActionState, useState } from "react";
import type { Briefing, BriefingCampaign, BriefingDeliverable, BriefingGoal } from "@/lib/types";
import type { BriefingState } from "@/app/(sistema)/go-cl/[id]/briefing/actions";
import { scopeFromBriefing } from "@/lib/go-cl/render";
import { Bridge, Tile, WidgetGroup, type Tint } from "../ui";

type Action = (state: BriefingState, formData: FormData) => Promise<BriefingState>;

const caption = "px-1 text-xs font-semibold uppercase tracking-wider text-muted";
const PERIODS = ["mensal", "semanal", "quinzenal", "trimestral", "única"];

function Section({
  icon,
  tint,
  title,
  hint,
  children,
}: {
  icon: string;
  tint: Tint;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <WidgetGroup>
      <div className="widget flex items-center gap-4 p-3">
        <Tile tint={tint} size="md">{icon}</Tile>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted">{hint}</p>
        </div>
      </div>
      <Bridge align="start" offset="3.5rem" />
      <div className="widget flex flex-col gap-4 p-5">{children}</div>
    </WidgetGroup>
  );
}

function Area({ name, label, value, placeholder, rows = 3 }: {
  name: string; label: string; value: string | null; placeholder: string; rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={caption}>{label}</span>
      <textarea name={name} rows={rows} defaultValue={value ?? ""} placeholder={placeholder} className="field h-auto py-3" />
    </label>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="tile size-11 shrink-0 text-muted transition hover:bg-tint-red hover:text-accent">✕</button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="btn btn-soft h-10 self-start px-4 text-sm">
      ＋ {children}
    </button>
  );
}

/** Atualiza um item de uma lista pelo índice. */
function patch<T>(list: T[], i: number, value: Partial<T>) {
  return list.map((x, j) => (j === i ? { ...x, ...value } : x));
}

export function BriefingForm({
  leadId,
  briefing,
  action,
}: {
  leadId: string;
  briefing: Briefing | null;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [goals, setGoals] = useState<BriefingGoal[]>(briefing?.goals?.length ? briefing.goals : [{ objetivo: "" }]);
  const [campaigns, setCampaigns] = useState<BriefingCampaign[]>(briefing?.campaigns ?? []);
  const [deliverables, setDeliverables] = useState<BriefingDeliverable[]>(
    briefing?.deliverables?.length ? briefing.deliverables : [{ item: "", periodicidade: "mensal" }],
  );
  const [status, setStatus] = useState<Briefing["status"]>(briefing?.status ?? "rascunho");

  const scope = scopeFromBriefing({
    deliverables: deliverables.filter((d) => d.item.trim()),
    campaigns: campaigns.filter((c) => c.nome.trim()),
  });

  return (
    <form action={formAction} className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="goals" value={JSON.stringify(goals)} />
      <input type="hidden" name="campaigns" value={JSON.stringify(campaigns)} />
      <input type="hidden" name="deliverables" value={JSON.stringify(deliverables)} />

      <div className="flex min-w-0 flex-col gap-8">
        <Section icon="🧭" tint="blue" title="Diretrizes" hint="Quem é o cliente, para quem fala e como deve soar.">
          <Area name="business_summary" label="O negócio" value={briefing?.business_summary ?? null}
            placeholder="O que a empresa faz, há quanto tempo, qual o diferencial." />
          <Area name="target_audience" label="Público-alvo" value={briefing?.target_audience ?? null}
            placeholder="Quem compra, faixa etária, região, hábitos." />
          <Area name="brand_guidelines" label="Marca e tom de voz" value={briefing?.brand_guidelines ?? null}
            placeholder="Identidade visual, cores, tom de voz, o que evitar." />
          <Area name="competitors" label="Concorrentes e referências" value={briefing?.competitors ?? null} rows={2}
            placeholder="Quem disputa o mesmo cliente e o que admiram em outras marcas." />
        </Section>

        <Section icon="🎯" tint="red" title="Propósitos e metas" hint="Por que contratar agora e como medir o sucesso.">
          <Area name="purpose" label="Propósito" value={briefing?.purpose ?? null}
            placeholder="O que motivou a busca por uma agência neste momento." />
          <div className="flex flex-col gap-2">
            <span className={caption}>Metas</span>
            {goals.map((g, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-[1.5rem] bg-tile/50 p-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <input value={g.objetivo} onChange={(e) => setGoals(patch(goals, i, { objetivo: e.target.value }))}
                  placeholder="Objetivo (ex.: mais agendamentos)" aria-label={`Objetivo ${i + 1}`} className="field bg-raised" />
                <input value={g.metrica ?? ""} onChange={(e) => setGoals(patch(goals, i, { metrica: e.target.value }))}
                  placeholder="Métrica" aria-label={`Métrica ${i + 1}`} className="field bg-raised" />
                <input value={g.meta ?? ""} onChange={(e) => setGoals(patch(goals, i, { meta: e.target.value }))}
                  placeholder="Meta (ex.: +30%)" aria-label={`Meta ${i + 1}`} className="field bg-raised" />
                <RemoveButton label={`Remover meta ${i + 1}`} onClick={() => setGoals(goals.filter((_, j) => j !== i))} />
              </div>
            ))}
            <AddButton onClick={() => setGoals([...goals, { objetivo: "" }])}>Adicionar meta</AddButton>
          </div>
        </Section>

        <Section icon="📦" tint="green" title="Entregas" hint="O que a agência vai produzir. Vira o escopo do contrato.">
          {deliverables.map((d, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-[1.5rem] bg-tile/50 p-2 sm:grid-cols-[6rem_minmax(0,1fr)_10rem_auto]">
              <input type="number" min={1} value={d.quantidade ?? ""} aria-label={`Quantidade ${i + 1}`}
                onChange={(e) => setDeliverables(patch(deliverables, i, { quantidade: e.target.value ? Math.max(1, Number(e.target.value)) : undefined }))}
                placeholder="Qtd." className="field col-span-2 bg-raised sm:col-span-1" />
              <input value={d.item} onChange={(e) => setDeliverables(patch(deliverables, i, { item: e.target.value }))}
                placeholder="Entrega (ex.: posts para o feed)" aria-label={`Entrega ${i + 1}`} className="field col-span-2 bg-raised sm:col-span-1" />
              <select value={d.periodicidade ?? ""} aria-label={`Periodicidade ${i + 1}`}
                onChange={(e) => setDeliverables(patch(deliverables, i, { periodicidade: e.target.value || undefined }))}
                className="field bg-raised">
                <option value="">Sem período</option>
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <RemoveButton label={`Remover entrega ${i + 1}`} onClick={() => setDeliverables(deliverables.filter((_, j) => j !== i))} />
            </div>
          ))}
          <AddButton onClick={() => setDeliverables([...deliverables, { item: "", periodicidade: "mensal" }])}>Adicionar entrega</AddButton>
        </Section>

        <Section icon="📣" tint="orange" title="Campanhas" hint="Ações com começo e fim: lançamentos, datas, promoções.">
          {campaigns.map((c, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[1.5rem] bg-tile/50 p-2">
              <div className="flex gap-2">
                <input value={c.nome} onChange={(e) => setCampaigns(patch(campaigns, i, { nome: e.target.value }))}
                  placeholder="Nome da campanha" aria-label={`Campanha ${i + 1}`} className="field bg-raised" />
                <RemoveButton label={`Remover campanha ${i + 1}`} onClick={() => setCampaigns(campaigns.filter((_, j) => j !== i))} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input value={c.canais?.join(", ") ?? ""} aria-label={`Canais da campanha ${i + 1}`}
                  onChange={(e) => setCampaigns(patch(campaigns, i, { canais: e.target.value.split(",").map((x) => x.trimStart()) }))}
                  placeholder="Canais (Instagram, Meta Ads...)" className="field bg-raised" />
                <input value={c.periodo ?? ""} onChange={(e) => setCampaigns(patch(campaigns, i, { periodo: e.target.value }))}
                  placeholder="Período (ex.: dezembro)" aria-label={`Período da campanha ${i + 1}`} className="field bg-raised" />
              </div>
              <textarea value={c.descricao ?? ""} rows={2} aria-label={`Descrição da campanha ${i + 1}`}
                onChange={(e) => setCampaigns(patch(campaigns, i, { descricao: e.target.value }))}
                placeholder="Ideia central, oferta, público" className="field h-auto bg-raised py-3" />
            </div>
          ))}
          <AddButton onClick={() => setCampaigns([...campaigns, { nome: "", canais: [] }])}>Adicionar campanha</AddButton>
        </Section>

        <Section icon="📈" tint="purple" title="Resultados prováveis" hint="O que esperar e com qual investimento.">
          <Area name="expected_results" label="Resultados esperados" value={briefing?.expected_results ?? null}
            placeholder="O que é realista alcançar e em quanto tempo." />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={caption}>Investimento previsto</span>
              <input name="budget_range" defaultValue={briefing?.budget_range ?? ""} placeholder="Ex.: R$ 2.000 a R$ 3.000/mês" className="field" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={caption}>Prazo para começar</span>
              <input name="deadline" type="date" defaultValue={briefing?.deadline ?? ""} className="field" />
            </label>
          </div>
          <Area name="notes" label="Observações" value={briefing?.notes ?? null} rows={2} placeholder="Qualquer outro ponto combinado." />
        </Section>
      </div>

      {/* Coluna lateral: escopo ao vivo + status + salvar */}
      <aside className="flex flex-col gap-6 xl:sticky xl:top-6 xl:h-fit">
        <WidgetGroup>
          <div className="widget flex items-center gap-3 p-3">
            <Tile tint="green" size="md">📄</Tile>
            <div>
              <h2 className="font-bold">Escopo do contrato</h2>
              <p className="text-xs text-muted">Atualiza enquanto você preenche.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-4">
            {scope ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{scope}</pre>
            ) : (
              <p className="text-sm text-muted">Adicione entregas ou campanhas para montar o escopo.</p>
            )}
          </div>
        </WidgetGroup>

        <div className="widget flex flex-col gap-3 p-4">
          <div role="radiogroup" aria-label="Situação do briefing" className="grid grid-cols-2 gap-1 rounded-[var(--radius-tile)] bg-tile p-1">
            {(["rascunho", "validado"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)}
                className={`h-10 rounded-[0.875rem] text-sm font-semibold transition ${status === s ? "bg-raised text-foreground shadow-sm" : "text-muted"}`}>
                {s === "rascunho" ? "Rascunho" : "Validado"}
              </button>
            ))}
          </div>
          <p className="px-1 text-xs text-muted">
            {status === "validado" ? "Validado: o cliente aprovou e o briefing pode gerar o contrato." : "Rascunho: ainda em conversa com o cliente."}
          </p>
          <button disabled={pending} className="btn btn-primary w-full">{pending ? "Salvando..." : "Salvar briefing"}</button>
          {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
          {state?.ok && <p role="status" className="text-sm font-medium text-ok">{state.ok}</p>}
        </div>
      </aside>
    </form>
  );
}
