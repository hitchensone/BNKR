import Link from "next/link";
import type { Briefing, ContactChannel, Lead, LeadInteraction } from "@/lib/types";
import type { FormState } from "@/app/(sistema)/go-cl/[id]/actions";
import { LEAD_STAGES, stageLabel } from "@/lib/go-cl/stages";
import { formatBRL } from "@/lib/go-cl/render";
import { Bridge, Tile, Widget, WidgetGroup } from "../ui";
import { CHANNEL, TEMPERATURE, formatDateTime } from "./labels";
import { MessageCard, type ReadyMessage } from "./message-card";
import { BriefingStatus } from "./briefing-header";
import { InteractionForm, LeadInfoForm } from "./lead-forms";

type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

export function LeadDetail({
  lead,
  briefing,
  interactions,
  messages,
  moveAction,
  saveAction,
  interactionAction,
  onUseMessage,
  now,
}: {
  lead: Lead;
  briefing: Briefing | null;
  interactions: LeadInteraction[];
  messages: ReadyMessage[];
  moveAction: (formData: FormData) => void | Promise<void>;
  saveAction: FormAction;
  interactionAction: FormAction;
  onUseMessage: (templateId: string, channel: ContactChannel, name: string) => Promise<void>;
  /** Momento da requisição, para marcar ações atrasadas. */
  now: number;
}) {
  const t = TEMPERATURE[lead.temperature];
  const overdue = lead.next_action_at != null && new Date(lead.next_action_at).getTime() < now;
  const meta = [lead.contact_name, lead.contact_role, lead.segment, lead.city].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-stretch gap-6">
        <WidgetGroup row className="w-full min-w-0 sm:w-auto sm:flex-1 sm:basis-96">
          <Link href="/go-cl" aria-label="Voltar ao funil" className="widget grid place-items-center p-3">
            <span className="tile size-12 text-lg">←</span>
          </Link>
          <div className="bridge" aria-hidden style={{ ["--bridge-size" as string]: "2rem" }} />
          <div className="widget flex min-w-0 flex-1 items-center gap-4 p-3 pr-5">
            <Tile tint={t.tint} size="lg"><span title={t.label}>{t.icon}</span></Tile>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-bold tracking-tight">{lead.company_name}</h1>
              <p className="truncate text-sm text-muted">{meta || "Sem detalhes do contato"}</p>
            </div>
            {lead.estimated_value != null && (
              <span className="pill hidden bg-tint-green text-[#3c8a2e] sm:inline-flex">{formatBRL(lead.estimated_value)}/mês</span>
            )}
          </div>
        </WidgetGroup>

        <Widget className="flex w-full flex-wrap items-center gap-3 p-3 pl-5 sm:w-auto">
          <div className="leading-tight">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Etapa</p>
            <p className="font-bold">{stageLabel(lead.stage)}</p>
          </div>
          <form action={moveAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={lead.id} />
            <select name="stage" defaultValue={lead.stage} aria-label="Mover para a etapa" className="field h-11 w-auto text-sm">
              {LEAD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button className="btn btn-primary h-11 px-4 text-sm">Mover</button>
          </form>
        </Widget>
      </div>

      {/* Próxima ação */}
      {lead.next_action && (
        <Widget className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 pr-5">
          <Tile tint={overdue ? "red" : "yellow"} size="md">{overdue ? "⏰" : "📌"}</Tile>
          <div className="min-w-48 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Próxima ação</p>
            <p className="font-semibold">{lead.next_action}</p>
          </div>
          {lead.next_action_at && (
            <span className={`pill ${overdue ? "bg-tint-red text-accent" : "bg-tile text-foreground"}`}>
              {overdue ? "Atrasada · " : ""}{formatDateTime(lead.next_action_at)}
            </span>
          )}
        </Widget>
      )}

      {/* Briefing */}
      <Widget className="flex flex-wrap items-center gap-x-4 gap-y-3 p-3 pr-4">
        <Tile tint="purple" size="md">📝</Tile>
        <div className="min-w-48 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-bold">Briefing</h2>
            <BriefingStatus briefing={briefing} />
          </div>
          <p className="text-sm text-muted">
            {briefing
              ? `${briefing.deliverables.length} entrega${briefing.deliverables.length === 1 ? "" : "s"} · ${briefing.campaigns.length} campanha${briefing.campaigns.length === 1 ? "" : "s"} · ${briefing.goals.length} meta${briefing.goals.length === 1 ? "" : "s"}`
              : "Diretrizes, propósitos, campanhas e resultados prováveis."}
          </p>
        </div>
        <Link href={`/go-cl/${lead.id}/briefing`} className="btn btn-primary h-11 px-5 text-sm">
          {briefing ? "Abrir briefing" : "Começar briefing"}
        </Link>
      </Widget>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          {/* Mensagens prontas */}
          <WidgetGroup>
            <div className="widget flex items-center gap-4 p-3">
              <Tile tint="green" size="md">💬</Tile>
              <div>
                <h2 className="text-lg font-bold">Mensagens prontas</h2>
                <p className="text-sm text-muted">Já preenchidas com os dados do lead. Ao usar, o envio entra no histórico.</p>
              </div>
            </div>
            <Bridge align="start" offset="3.5rem" />
            <div className="widget flex flex-col gap-3 p-3">
              {messages.map((m) => <MessageCard key={m.templateId} message={m} onUse={onUseMessage} />)}
              {messages.length === 0 && <p className="p-4 text-center text-sm text-muted">Nenhum modelo de mensagem ativo.</p>}
            </div>
          </WidgetGroup>

          {/* Histórico */}
          <WidgetGroup>
            <div className="widget flex items-center gap-4 p-3">
              <Tile tint="blue" size="md">🕑</Tile>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Histórico de contatos</h2>
                <p className="text-sm text-muted">{interactions.length} registro{interactions.length === 1 ? "" : "s"}</p>
              </div>
            </div>
            <Bridge align="start" offset="3.5rem" />
            <div className="widget flex flex-col gap-4 p-4">
              <InteractionForm leadId={lead.id} action={interactionAction} />
              <ol className="flex flex-col gap-1">
                {interactions.map((i) => {
                  const c = CHANNEL[i.channel];
                  return (
                    <li key={i.id} className="flex gap-3 rounded-[1.25rem] p-2">
                      <Tile tint={c.tint} size="sm">{c.icon}</Tile>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{i.summary}</p>
                        <p className="text-xs text-muted">
                          {c.label} · {i.direction === "entrada" ? "lead contatou" : "você contatou"} · {formatDateTime(i.occurred_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
                {interactions.length === 0 && (
                  <li className="p-4 text-center text-sm text-muted">Nenhum contato registrado ainda.</li>
                )}
              </ol>
            </div>
          </WidgetGroup>
        </div>

        {/* Dados do lead */}
        <WidgetGroup className="h-fit">
          <div className="widget flex items-center gap-4 p-3">
            <Tile tint="purple" size="md">🗂️</Tile>
            <div>
              <h2 className="text-lg font-bold">Dados do lead</h2>
              <p className="text-sm text-muted">Usados nas mensagens e, depois, no contrato.</p>
            </div>
          </div>
          <Bridge align="start" offset="3.5rem" />
          <div className="widget p-5">
            <LeadInfoForm lead={lead} action={saveAction} />
          </div>
        </WidgetGroup>
      </div>
    </div>
  );
}
